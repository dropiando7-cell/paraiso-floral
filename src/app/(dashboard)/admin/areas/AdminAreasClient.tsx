'use client';

import React, { useState, useTransition } from 'react';
import { Area } from '@prisma/client';
import { Plus, Edit2, Trash2, Printer, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createArea, updateArea, deleteArea } from './actions';

interface Props {
    initialAreas: Area[];
}

export default function AdminAreasClient({ initialAreas }: Props) {
    const [areas, setAreas] = useState<Area[]>(initialAreas);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [isPending, startTransition] = useTransition();

    // Print Preview Modal states
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [printingArea, setPrintingArea] = useState<Area | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const filteredAreas = areas.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.prefix.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filteredAreas.length / ITEMS_PER_PAGE));
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    const paginatedAreas = filteredAreas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const handleOpenModal = (area?: Area) => {
        setSelectedArea(area || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedArea(null);
        setIsModalOpen(false);
    };

    const handleOpenPreview = (area: Area) => {
        setPrintingArea(area);
        setIsPreviewOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar el área "${name}"? Esto podría fallar si hay activos usándola.`)) return;

        startTransition(async () => {
            const res = await deleteArea(id);
            if (res.success) {
                setAreas(areas.filter(a => a.id !== id));
            } else {
                alert(res.error);
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            if (selectedArea) {
                const res = await updateArea(selectedArea.id, formData);
                if (res.success) {
                    // Recargarías idealmente llamando a getAreas o haciendo router.refresh() 
                    // pero por simplicidad actualizamos el estado local asumiendo exito
                    window.location.reload();
                } else {
                    alert(res.error);
                }
            } else {
                const res = await createArea(formData);
                if (res.success) {
                    window.location.reload();
                } else {
                    alert(res.error);
                }
            }
        });
    };

    const printLabelFromPreview = async () => {
        if (!printingArea) return;
        setIsPrinting(true);
        try {
            const urlImagen = `${window.location.origin}/api/impresion/generar-etiqueta-area?idQr=${encodeURIComponent(printingArea.qrCode)}&areaName=${encodeURIComponent(printingArea.description || printingArea.name)}&areaPrefix=${encodeURIComponent(printingArea.prefix)}`;

            const res = await fetch('/api/impresion/encolar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: null, // El backend usará el primer activo de la org
                    urlImagen
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al encolar impresión');
            }

            alert("Etiqueta añadida a la cola de impresión exitosamente. La impresora Tally Dascom debería estar escaneando.");
            setIsPreviewOpen(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsPrinting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mantenimiento de Áreas Físicas</h1>
                    <p className="text-sm text-gray-500">
                        Administra los códigos, ubicaciones y genera las llaves QR de puerta del inventario.
                    </p>
                </div>
                <button onClick={() => handleOpenModal()} className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white shadow-sm focus:outline-none disabled:opacity-50">
                    <Plus className="mr-2 h-4 w-4" /> Nueva Área
                </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                    <div className="relative max-w-sm w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o prefijo..."
                            value={search}
                            onChange={handleSearchChange}
                            className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 py-2 border shadow-sm"
                        />
                    </div>
                    <div className="text-sm text-gray-500 font-medium self-center">
                        {filteredAreas.length} Áreas registradas
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Área (Valor Interno)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefijo Activos</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR de Puerta</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedAreas.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No se encontraron áreas.
                                    </td>
                                </tr>
                            ) : (
                                paginatedAreas.map((area) => (
                                    <tr key={area.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{area.name}</div>
                                            <div className="text-xs text-gray-500">{area.description || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {area.prefix}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{area.qrCode}</code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button type="button" onClick={() => handleOpenPreview(area)} className="text-green-600 hover:text-green-900 mr-2 p-1" title="Vista Previa e Imprimir QR">
                                                <Printer className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => handleOpenModal(area)} className="text-indigo-600 hover:text-indigo-900 mr-2 p-1">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => handleDelete(area.id, area.name)} className="text-red-600 hover:text-red-900 p-1">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-lg">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={validCurrentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={validCurrentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                                    <span className="font-medium">
                                        {Math.min(startIndex + ITEMS_PER_PAGE, filteredAreas.length)}
                                    </span>{' '}
                                    de <span className="font-medium">{filteredAreas.length}</span> resultados
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={validCurrentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                        {validCurrentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={validCurrentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Siguiente</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal CRUD */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 bg-slate-900/50 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={handleCloseModal}></div>
                    <div className="relative bg-white rounded-xl shadow-xl transform transition-all sm:max-w-lg sm:w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="overflow-y-auto w-full">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                {selectedArea ? 'Editar Área' : 'Nueva Área'}
                                            </h3>
                                            <div className="mt-4 space-y-4">
                                                <div>
                                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre Interno (ej. PB-A1-OF.PASTOR) *</label>
                                                    <input type="text" name="name" id="name" required defaultValue={selectedArea?.name} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                                    <p className="text-xs text-gray-500 mt-1">Este nombre se guardará en la base de datos de los activos.</p>
                                                </div>
                                                <div>
                                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción / Nombre Amigable (ej. Oficina del Pastor)</label>
                                                    <input type="text" name="description" id="description" defaultValue={selectedArea?.description || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                                </div>
                                                <div>
                                                    <label htmlFor="prefix" className="block text-sm font-medium text-gray-700">Prefijo de Activos (ej. ELIM-PB-A01-OF) *</label>
                                                    <input type="text" name="prefix" id="prefix" required defaultValue={selectedArea?.prefix} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                                </div>
                                                <div>
                                                    <label htmlFor="qrCode" className="block text-sm font-medium text-gray-700">Llave QR Física de Puerta *</label>
                                                    <input type="text" name="qrCode" id="qrCode" required defaultValue={selectedArea?.qrCode} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Se autogenerará si se deja en blanco en nuevas areas..." />
                                                    <p className="text-xs text-gray-500 mt-1">Este valor debe coincidir o ser único si quieres generar un QR propio de esta área.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button type="submit" disabled={isPending} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                                        {isPending ? 'Guardando...' : 'Guardar'}
                                    </button>
                                    <button type="button" onClick={handleCloseModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Preview Modal */}
            {isPreviewOpen && printingArea && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 bg-slate-900/50 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setIsPreviewOpen(false)}></div>
                    <div className="relative bg-white rounded-xl shadow-xl transform transition-all sm:max-w-xl sm:w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="overflow-y-auto w-full">
                            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Vista Previa de Etiqueta QR</h3>
                                <p className="mt-1 max-w-2xl text-sm text-gray-500">Asegúrate de que la impresora Tally Dascom de 2x1" esté conectada y lista.</p>
                            </div>
                            <div className="p-6 flex flex-col items-center bg-gray-100">
                                {/* Vista previa renderizada cargando la misma URL que va a la impresora pero en un tag de imagen */}
                                <div className="bg-white p-2 shadow-sm border border-gray-300 inline-block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`/api/impresion/generar-etiqueta-area?idQr=${encodeURIComponent(printingArea.qrCode)}&areaName=${encodeURIComponent(printingArea.description || printingArea.name)}&areaPrefix=${encodeURIComponent(printingArea.prefix)}`}
                                        alt="Vista previa etiqueta"
                                        style={{ width: '406px', height: '203px', objectFit: 'contain' }}
                                        className="max-w-full"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-4 text-center">La imagen de arriba es exactamente el archivo que se enviará al spooler.</p>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="button" onClick={printLabelFromPreview} disabled={isPrinting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                                    {isPrinting ? 'Enviando...' : 'Imprimir Etiqueta'}
                                </button>
                                <button type="button" onClick={() => setIsPreviewOpen(false)} disabled={isPrinting} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
