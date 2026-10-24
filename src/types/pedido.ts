export interface EtiquetaSerialInfo {
  id: string;
  codigoSerial: string;
  codigoPadre: string;
  estado: string;
  alistadoAt?: string | null;
  chequeadoAt?: string | null;
}

export interface PedidoItem {
  id: string;
  productoId: string;
  nombreProducto: string;
  variedadTono?: string;
  codigoBarras?: string;
  cantidadSolicitada: number;
  cantidadPreparada: number;
  cantidadChequeada?: number;
  chequeado?: boolean;
  sustituidoPor?: {
    productoId: string;
    nombreProducto: string;
  };
  recolectado: boolean;
  serialesEscaneados?: EtiquetaSerialInfo[];
}

export interface Pedido {
  id: string;
  codigoPedido: string; // ej. PED-2026-0042
  cliente: {
    id: string;
    nombre: string;
    telefono: string;
    direccion?: string;
    notas?: string;
  };
  destino: string;
  estado: 'pendiente' | 'en_preparacion' | 'en_chequeo' | 'completado' | 'listo_para_facturar' | 'facturado' | 'despachado';
  estadoPago: 'pagado' | 'contra_entrega' | 'credito';
  tipoDespacho?: 'INMEDIATO' | 'PROGRAMADO' | 'RECOGE_TIENDA' | string;
  horaDespacho?: string | null;
  motoristaRuta?: string | null;
  auxiliarAsignado?: {
    id: string;
    nombre: string;
    avatar?: string;
  };
  chequeadoPor?: {
    id: string;
    nombre: string;
  };
  chequeadoAt?: string | null;
  facturaId?: string | null;
  items: PedidoItem[];
  etiquetasSerial?: EtiquetaSerialInfo[];
  notas?: string;
  createdAt: string;
}
