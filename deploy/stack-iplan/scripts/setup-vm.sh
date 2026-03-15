#!/bin/bash
set -euo pipefail

# =============================================================================
# setup-vm.sh - Setup inicial de una VM Ubuntu 24.04 para IPLAN
# Ejecutar como root o con sudo en cada VM nueva.
# Uso: sudo bash setup-vm.sh <vm1|vm2|vm3>
# =============================================================================

VM_ROLE="${1:?Uso: sudo bash setup-vm.sh <vm1|vm2|vm3>}"

echo "=== Setup VM: ${VM_ROLE} ==="

# --- Docker ---
echo "[1/5] Installing Docker..."
if ! command -v docker &> /dev/null; then
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker administrador
  echo "  Docker installed. User 'administrador' added to docker group."
else
  echo "  Docker already installed."
fi

# --- SSH hardening ---
echo "[2/5] Hardening SSH..."
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# --- fail2ban ---
echo "[3/5] Installing fail2ban..."
if ! command -v fail2ban-client &> /dev/null; then
  apt-get install -y fail2ban
  systemctl enable fail2ban
  systemctl start fail2ban
fi

# --- Firewall (UFW) ---
echo "[4/5] Configuring UFW..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'

case "$VM_ROLE" in
  vm1)
    ufw allow 80/tcp comment 'HTTP from NPM'
    echo "  Opened: 22, 80"
    ;;
  vm2)
    ufw allow from 10.8.10.120 to any port 5432 proto tcp comment 'PG from VM1'
    ufw allow from 10.8.10.120 to any port 6379 proto tcp comment 'Redis from VM1'
    ufw allow from 10.8.10.120 to any port 9000 proto tcp comment 'MinIO from VM1'
    ufw allow from 10.8.10.122 to any port 5432 proto tcp comment 'PG from VM3 (replica)'
    ufw allow from 10.8.10.122 to any port 9000 proto tcp comment 'MinIO from VM3 (backup)'
    echo "  Opened: 22, 5432/6379/9000 (VM1+VM3 only)"
    ;;
  vm3)
    ufw allow from 10.8.10.120 to any port 3100 proto tcp comment 'Loki from VM1'
    ufw allow from 10.8.10.121 to any port 3100 proto tcp comment 'Loki from VM2'
    echo "  Opened: 22, 3100 (VM1+VM2 only)"
    echo "  Grafana (3000) y Prometheus (9090) accesibles solo via VPN o SSH tunnel"
    ;;
esac

ufw --force enable

# --- Automatic security updates ---
echo "[5/5] Enabling unattended-upgrades..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

echo ""
echo "=== Setup complete for ${VM_ROLE} ==="
echo "Reboot recommended. Then login as 'administrador' (docker group active after relogin)."
