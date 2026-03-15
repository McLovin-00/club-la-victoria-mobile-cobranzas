# Provisionamiento de VMs - IPLAN Production

## Pre-requisitos

- Servidor fisico con Windows Server 2022/2025 e Hyper-V habilitado
- ISO de Ubuntu 24.04 LTS Server descargada
- vSwitch externo creado en Hyper-V conectado al NIC fisico

---

## Paso 1: Crear las 3 VMs en Hyper-V

Abrir PowerShell como Administrador en el host Windows.

### VM1 - QB-App-Edge (10.8.10.120)

```powershell
# Crear VM
New-VM -Name "QB-App-Edge" -Generation 2 -MemoryStartupBytes 32GB -SwitchName "External-vSwitch"
Set-VM -Name "QB-App-Edge" -ProcessorCount 8 -StaticMemory -AutomaticCheckpointsEnabled $false

# Disco OS (100 GB fijo)
New-VHD -Path "D:\VMs\QB-App-Edge\disk-os.vhdx" -SizeBytes 100GB -Fixed
Add-VMHardDiskDrive -VMName "QB-App-Edge" -Path "D:\VMs\QB-App-Edge\disk-os.vhdx"

# Secure boot para Linux
Set-VMFirmware -VMName "QB-App-Edge" -SecureBootTemplate "MicrosoftUEFICertificateAuthority"

# Montar ISO
Add-VMDvdDrive -VMName "QB-App-Edge" -Path "C:\ISOs\ubuntu-24.04-live-server-amd64.iso"

# Boot order: DVD primero
$dvd = Get-VMDvdDrive -VMName "QB-App-Edge"
Set-VMFirmware -VMName "QB-App-Edge" -FirstBootDevice $dvd
```

### VM2 - QB-DataLayer (10.8.10.121)

```powershell
New-VM -Name "QB-DataLayer" -Generation 2 -MemoryStartupBytes 32GB -SwitchName "External-vSwitch"
Set-VM -Name "QB-DataLayer" -ProcessorCount 4 -StaticMemory -AutomaticCheckpointsEnabled $false

# Disco OS (80 GB)
New-VHD -Path "D:\VMs\QB-DataLayer\disk-os.vhdx" -SizeBytes 80GB -Fixed
Add-VMHardDiskDrive -VMName "QB-DataLayer" -Path "D:\VMs\QB-DataLayer\disk-os.vhdx"

# Disco datos (1 TB) - idealmente en NVMe
New-VHD -Path "D:\VMs\QB-DataLayer\disk-data.vhdx" -SizeBytes 1TB -Fixed
Add-VMHardDiskDrive -VMName "QB-DataLayer" -Path "D:\VMs\QB-DataLayer\disk-data.vhdx"

Set-VMFirmware -VMName "QB-DataLayer" -SecureBootTemplate "MicrosoftUEFICertificateAuthority"
Add-VMDvdDrive -VMName "QB-DataLayer" -Path "C:\ISOs\ubuntu-24.04-live-server-amd64.iso"
$dvd = Get-VMDvdDrive -VMName "QB-DataLayer"
Set-VMFirmware -VMName "QB-DataLayer" -FirstBootDevice $dvd
```

### VM3 - QB-Bkp-Mon (10.8.10.122)

```powershell
New-VM -Name "QB-Bkp-Mon" -Generation 2 -MemoryStartupBytes 16GB -SwitchName "External-vSwitch"
Set-VM -Name "QB-Bkp-Mon" -ProcessorCount 4 -StaticMemory -AutomaticCheckpointsEnabled $false

# Disco OS (80 GB)
New-VHD -Path "D:\VMs\QB-Bkp-Mon\disk-os.vhdx" -SizeBytes 80GB -Fixed
Add-VMHardDiskDrive -VMName "QB-Bkp-Mon" -Path "D:\VMs\QB-Bkp-Mon\disk-os.vhdx"

# Disco backups (1 TB) - puede ser HDD
New-VHD -Path "E:\VMs\QB-Bkp-Mon\disk-backup.vhdx" -SizeBytes 1TB -Fixed
Add-VMHardDiskDrive -VMName "QB-Bkp-Mon" -Path "E:\VMs\QB-Bkp-Mon\disk-backup.vhdx"

Set-VMFirmware -VMName "QB-Bkp-Mon" -SecureBootTemplate "MicrosoftUEFICertificateAuthority"
Add-VMDvdDrive -VMName "QB-Bkp-Mon" -Path "C:\ISOs\ubuntu-24.04-live-server-amd64.iso"
$dvd = Get-VMDvdDrive -VMName "QB-Bkp-Mon"
Set-VMFirmware -VMName "QB-Bkp-Mon" -FirstBootDevice $dvd
```

### Iniciar las VMs

```powershell
Start-VM -Name "QB-App-Edge"
Start-VM -Name "QB-DataLayer"
Start-VM -Name "QB-Bkp-Mon"
```

Conectarse a cada VM via Hyper-V Manager > Connect para completar la instalacion de Ubuntu.

---

## Paso 2: Instalar Ubuntu 24.04 LTS

Durante la instalacion de cada VM:

1. **Idioma**: English
2. **Keyboard**: Spanish (Latin American) o segun preferencia
3. **Network**: Configurar IP estatica (ver tabla abajo)
4. **Storage**: 
   - VM1: usar disco completo para /
   - VM2: disco 1 para /, disco 2 montar en `/data` (para Docker volumes)
   - VM3: disco 1 para /, disco 2 montar en `/opt/bca/backups`
5. **Profile**:
   - Name: `administrador`
   - Server name: segun tabla
   - Password: (el que decidas)
6. **SSH**: Install OpenSSH server = **Yes**
7. **Snaps**: No instalar ninguno

### IPs y hostnames

| VM | Hostname | IP | Gateway | DNS |
|----|----------|-----|---------|-----|
| VM1 | qb-app-edge | 10.8.10.120/24 | 10.8.10.1 | 10.8.10.1 |
| VM2 | qb-datalayer | 10.8.10.121/24 | 10.8.10.1 | 10.8.10.1 |
| VM3 | qb-bkp-mon | 10.8.10.122/24 | 10.8.10.1 | 10.8.10.1 |

Si el installer no permite IP estatica, configurar despues con netplan.

---

## Paso 3: Configurar red estatica (si no se hizo en el installer)

En cada VM, editar netplan:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

Ejemplo para VM1 (10.8.10.120):

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 10.8.10.120/24
      routes:
        - to: default
          via: 10.8.10.1
      nameservers:
        addresses:
          - 10.8.10.1
          - 8.8.8.8
```

Aplicar:

```bash
sudo netplan apply
```

Verificar conectividad:

```bash
ping -c 3 10.8.10.1      # Gateway
ping -c 3 10.8.10.20     # Produccion actual
ping -c 3 8.8.8.8        # Internet
```

---

## Paso 4: Montar disco de datos (VM2 y VM3)

### VM2 - Disco de datos en /data

```bash
# Identificar el disco (normalmente sdb)
lsblk

# Crear particion y formatear
sudo parted /dev/sdb mklabel gpt
sudo parted /dev/sdb mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/sdb1

# Montar
sudo mkdir -p /data
echo '/dev/sdb1 /data ext4 defaults 0 2' | sudo tee -a /etc/fstab
sudo mount -a

# Crear directorio para Docker volumes
sudo mkdir -p /data/docker
```

Configurar Docker para usar `/data/docker`:

```bash
sudo mkdir -p /etc/docker
echo '{"data-root": "/data/docker"}' | sudo tee /etc/docker/daemon.json
```

### VM3 - Disco de backups en /opt/bca/backups

```bash
sudo parted /dev/sdb mklabel gpt
sudo parted /dev/sdb mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/sdb1

sudo mkdir -p /opt/bca/backups
echo '/dev/sdb1 /opt/bca/backups ext4 defaults 0 2' | sudo tee -a /etc/fstab
sudo mount -a
```

---

## Paso 5: Copiar clave SSH desde esta maquina

Desde la maquina de desarrollo (donde estas ahora):

```bash
# Generar una clave nueva para IPLAN (si no existe)
ssh-keygen -t ed25519 -f ~/.ssh/bca_iplan -C "cursor-deploy-iplan"

# Copiar a las 3 VMs (pedira password de 'administrador')
ssh-copy-id -i ~/.ssh/bca_iplan.pub administrador@10.8.10.120
ssh-copy-id -i ~/.ssh/bca_iplan.pub administrador@10.8.10.121
ssh-copy-id -i ~/.ssh/bca_iplan.pub administrador@10.8.10.122

# Verificar acceso sin password
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.120 'hostname'
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.121 'hostname'
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.122 'hostname'
```

---

## Paso 6: Ejecutar setup automatizado

```bash
# VM1
scp -i ~/.ssh/bca_iplan deploy/stack-iplan/scripts/setup-vm.sh administrador@10.8.10.120:/tmp/
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.120 'sudo bash /tmp/setup-vm.sh vm1'

# VM2
scp -i ~/.ssh/bca_iplan deploy/stack-iplan/scripts/setup-vm.sh administrador@10.8.10.121:/tmp/
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.121 'sudo bash /tmp/setup-vm.sh vm2'

# VM3
scp -i ~/.ssh/bca_iplan deploy/stack-iplan/scripts/setup-vm.sh administrador@10.8.10.122:/tmp/
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.122 'sudo bash /tmp/setup-vm.sh vm3'
```

El script instala Docker, hardena SSH, configura UFW y habilita auto-updates.

---

## Paso 7: Verificacion final

```bash
# Verificar Docker funciona (reconectarse para que el grupo docker aplique)
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.120 'docker --version && docker compose version'
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.121 'docker --version && docker compose version'
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.122 'docker --version && docker compose version'

# Verificar red entre VMs
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.120 'ping -c 1 10.8.10.121 && ping -c 1 10.8.10.122'

# Verificar UFW
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.120 'sudo ufw status verbose'
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.121 'sudo ufw status verbose'
ssh -i ~/.ssh/bca_iplan administrador@10.8.10.122 'sudo ufw status verbose'
```

Cuando todo este OK, seguir con el MIGRATION-RUNBOOK.md.
