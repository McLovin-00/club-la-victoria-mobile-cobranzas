import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import type { Remito } from '../../types';

describe('RemitoDetail', () => {
  it('cubre approve/reject/reprocess/edit', async () => {
    const approveUnwrap = jest.fn(async () => ({ success: true }));
    const rejectUnwrap = jest.fn(async () => ({ success: true }));
    const reprocessUnwrap = jest.fn(async () => ({ success: true }));
    const updateUnwrap = jest.fn(async () => ({ success: true }));

    const approve = jest.fn(() => ({ unwrap: approveUnwrap }));
    const reject = jest.fn(() => ({ unwrap: rejectUnwrap }));
    const reprocess = jest.fn(() => ({ unwrap: reprocessUnwrap }));
    const updateRemito = jest.fn(() => ({ unwrap: updateUnwrap }));

    const initial: Remito = {
      id: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      numeroRemito: 'R-1',
      fechaOperacion: new Date().toISOString(),
      emisorNombre: 'E',
      emisorDetalle: 'ED',
      clienteNombre: 'C',
      producto: 'P',
      transportistaNombre: 'T',
      choferNombre: 'CN',
      choferDni: '123',
      patenteChasis: 'AAA111',
      patenteAcoplado: 'BBB222',
      pesoOrigenBruto: 1,
      pesoOrigenTara: 1,
      pesoOrigenNeto: 1,
      pesoDestinoBruto: 1,
      pesoDestinoTara: 1,
      pesoDestinoNeto: 1,
      tieneTicketDestino: false,
      equipoId: null,
      choferId: null,
      dadorCargaId: 1,
      tenantEmpresaId: 1,
      choferCargadorDni: null,
      choferCargadorNombre: null,
      choferCargadorApellido: null,
      estado: 'PENDIENTE_APROBACION',
      cargadoPorUserId: 1,
      cargadoPorRol: 'ADMIN',
      aprobadoPorUserId: null,
      aprobadoAt: null,
      rechazadoPorUserId: null,
      rechazadoAt: null,
      motivoRechazo: null,
      confianzaIA: null,
      camposDetectados: [],
      erroresAnalisis: [],
      analizadoAt: null,
      imagenes: [],
    };

    await jest.unstable_mockModule('../../api/remitosApiSlice', () => ({
      useGetRemitoQuery: () => ({ data: { data: initial }, isLoading: false }),
      useApproveRemitoMutation: () => [approve, { isLoading: false }],
      useRejectRemitoMutation: () => [reject, { isLoading: false }],
      useReprocessRemitoMutation: () => [reprocess, { isLoading: false }],
      useUpdateRemitoMutation: () => [updateRemito, { isLoading: false }],
    }));

    const onBack = jest.fn();
    const { RemitoDetail } = await import('../RemitoDetail');

    render(<RemitoDetail remito={initial} onBack={onBack} canApprove />);

    // aprobar
    fireEvent.click(screen.getByText('Aprobar'));
    await waitFor(() => expect(approve).toHaveBeenCalledWith(1));

    // rechazar (habilita cuando motivo >=5)
    fireEvent.click(screen.getAllByText('Rechazar')[0]);
    expect(screen.getByText('Rechazar Remito')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Motivo del rechazo (mínimo 5 caracteres)') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'no' } });
    const confirmBtn = screen.getByText('Confirmar Rechazo') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'motivo válido' } });
    expect(confirmBtn.disabled).toBe(false);
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(reject).toHaveBeenCalledWith({ id: 1, motivo: 'motivo válido' }));

    // reprocesar
    fireEvent.click(screen.getByText('Reprocesar con IA'));
    await waitFor(() => expect(reprocess).toHaveBeenCalledWith(1));
    await waitFor(() => expect(onBack).toHaveBeenCalled());

    // editar y guardar
    fireEvent.click(screen.getByText('Editar'));
    const numero = screen.getByDisplayValue('R-1') as HTMLInputElement;
    fireEvent.change(numero, { target: { value: 'R-2' } });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(updateRemito).toHaveBeenCalled());
  });
});


