export interface PedidoItem {
  id: string;
  productoId: string;
  nombreProducto: string;
  variedadTono?: string;
  codigoBarras?: string;
  cantidadSolicitada: number;
  cantidadPreparada: number;
  sustituidoPor?: {
    productoId: string;
    nombreProducto: string;
  };
  recolectado: boolean;
}

export interface Pedido {
  id: string;
  codigoPedido: string; // ej. PED-2026-0042
  cliente: {
    id: string;
    nombre: string;
    telefono: string;
    direccion?: string;
  };
  destino: string;
  estado: 'pendiente' | 'en_preparacion' | 'completado' | 'despachado';
  estadoPago: 'pagado' | 'contra_entrega' | 'credito';
  auxiliarAsignado?: {
    id: string;
    nombre: string;
    avatar?: string;
  };
  items: PedidoItem[];
  notas?: string;
  createdAt: string;
}
