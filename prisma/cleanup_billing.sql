DELETE FROM "detalles_factura";
DELETE FROM "facturas";
SELECT setval(pg_get_serial_sequence('facturas', 'numeroInterno'), 1131, true);
