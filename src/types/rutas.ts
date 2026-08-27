export type RutaEstado = 'CARGANDO' | 'EN_RUTA' | 'EN_LIQUIDACION' | 'LIQUIDADA';

export interface ITruckCargo {
  id: string;
  rutaId: string;
  bahia: string; // A1 a C5
  facturaId?: string;
  facturaNumero?: string;
  contenido: string;
}

export interface IRutaPedido {
  id: string;
  rutaId: string;
  facturaId: string;
  facturaNumero: string;
  clienteNombre: string;
  totalFactura: number;
  estadoEntrega: 'PENDIENTE' | 'ENTREGADO' | 'RECHAZADO';
  motivoRechazo?: string;
  montoCobrado: number;
  formaPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO';
  firmaUrl?: string;
  fotoComprobanteUrl?: string;
  entregadoAt?: string;
}

export interface IRutaStock {
  id: string;
  rutaId: string;
  productoId: string;
  productoNombre: string;
  productoSku: string;
  cantidadCargada: number;
  cantidadVendida: number;
  cantidadEntregada: number;
  cantidadDevuelta: number;
  cantidadMerma: number;
  cantidadDiferencia: number;
}

export interface IMerma {
  id: string;
  rutaId: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  motivo: string;
  fotoUrl?: string;
}

export interface IRutaAbono {
  id: string;
  rutaId: string;
  clienteId: string;
  clienteNombre: string;
  monto: number;
  formaPago: 'EFECTIVO' | 'TRANSFERENCIA';
  referencia?: string;
  createdAt: string;
}

export interface IRuta {
  id: string;
  organizationId: string;
  camionPlaca: string;
  conductorId: string;
  conductorNombre: string;
  conductorAvatar?: string;
  rutaNombre: string;
  estado: RutaEstado;
  dock?: string;
  fechaSalida?: string;
  fechaRetorno?: string;
  capacidadKilos: number;
  volumenM3: number;
  
  // Financiero
  efectivoInicial: number;
  ventasContado: number;
  abonosCxC: number;
  efectivoEntregado: number;
  diferenciaFinanciera: number;

  acompanante?: string;
  fotoUrl?: string;
  gastosIniciales?: IGastosDesglose;
  gastosReportados?: IGastosDesglose;
  gastosExtras?: IExtraGasto[];

  createdAt: string;
  updatedAt: string;

  cargoGrid: ITruckCargo[];
  pedidos: IRutaPedido[];
  inventario: IRutaStock[];
  mermas: IMerma[];
  abonos: IRutaAbono[];
}

export interface IGastosDesglose {
  vueltos: number;
  gasolina: number;
  comida: number;
  otros: number;
}

export interface IExtraGasto {
  concepto: string;
  monto: number;
}

export interface ICamion {
  id: string;
  organizationId: string;
  placa: string;
  conductorId: string;
  conductorNombre: string;
  acompanante?: string;
  capacidadKilos: number;
  volumenM3: number;
  fotoUrl?: string;
  createdAt?: string;
}

export interface IVentaMovil {
  clienteId: string;
  clienteNombre: string;
  items: {
    productoId: string;
    productoNombre: string;
    productoSku: string;
    cantidad: number;
    precioUnitario: number;
    isv: number;
  }[];
  formaPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO';
  efectivoRecibido?: number;
  referenciaTransferencia?: string;
  total: number;
}
