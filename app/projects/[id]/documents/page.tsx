'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useProject } from '@/context/AppContext';
import { Card, Button, Badge, Alert } from '@/components/ui';
import { ConfidenceBadge } from '@/components/ai/ConfidenceBadge';
import {
  FileText, ZoomIn, ZoomOut, Maximize2, RotateCw, Search,
  ChevronLeft, ChevronRight, Eye, Sparkles, Layers, CheckCircle2,
  Crosshair, MapPin
} from 'lucide-react';

export default function DocumentViewerPage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = useProject(projectId);

  const [selectedDocId, setSelectedDocId] = useState<string>(project?.documents[0]?.id || 'doc1');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [showVisionOverlay, setShowVisionOverlay] = useState(true);
  const [activePin, setActivePin] = useState<string | null>('d102');

  const selectedDoc = project?.documents.find((d) => d.id === selectedDocId) || project?.documents[0];

  const MOCK_DETECTIONS = [
    {
      id: 'd102',
      doorNumber: 'Door D-102',
      location: 'Ground Floor East Wing',
      type: 'Internal Fire Door',
      fireRating: '120 min',
      confidence: 'High' as const,
      confidenceScore: 91,
      source: 'Drawing A-102',
      x: 35, // percentage
      y: 42,
    },
    {
      id: 'd103',
      doorNumber: 'Door D-103',
      location: 'Main Corridor Entrance',
      type: 'Internal Fire Door',
      fireRating: '120 min',
      confidence: 'High' as const,
      confidenceScore: 95,
      source: 'Drawing A-102',
      x: 65,
      y: 28,
    },
    {
      id: 'd104',
      doorNumber: 'Door D-104',
      location: 'Stairwell Access',
      type: 'Security Fire Door',
      fireRating: '120 min',
      confidence: 'Medium' as const,
      confidenceScore: 78,
      source: 'Drawing A-102',
      x: 50,
      y: 70,
    },
  ];

  return (
    <div className="h-[calc(100vh-13rem)] flex gap-4">
      {/* Left / Main Document Viewer Canvas */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Document Header Controls Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 text-xs">
          {/* Doc Selector */}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-700 focus:outline-none"
            >
              {project?.documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename} ({doc.pageCount ?? 1} pages)
                </option>
              ))}
            </select>
          </div>

          {/* Page Nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-slate-600 font-medium">Page {currentPage} of {selectedDoc?.pageCount || 12}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(selectedDoc?.pageCount || 12, p + 1))}
              disabled={currentPage >= (selectedDoc?.pageCount || 12)}
              className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom & Overlay Controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="p-1 text-slate-500 hover:text-slate-700" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-slate-600 w-10 text-center font-medium">{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="p-1 text-slate-500 hover:text-slate-700" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <button
              onClick={() => setShowVisionOverlay((v) => !v)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded font-medium transition-colors ${
                showVisionOverlay ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Vision Overlay
            </button>
          </div>
        </div>

        {/* Drawing / Document Canvas Area */}
        <div className="flex-1 bg-slate-900 relative overflow-auto flex items-center justify-center p-8">
          <div
            className="bg-slate-800 border-2 border-slate-700 rounded shadow-2xl relative transition-transform duration-150"
            style={{ width: `${600 * (zoom / 100)}px`, height: `${420 * (zoom / 100)}px` }}
          >
            {/* Mock Blueprint Blueprint / Grid Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* Drawing Layout Elements */}
            <div className="absolute inset-4 border border-slate-600/50 flex flex-col justify-between p-4 pointer-events-none">
              <div className="flex justify-between items-start text-[10px] text-slate-400 font-mono">
                <div>ARCHITECTURAL DRAWING A-102<br />GROUND FLOOR FIRE STRATEGY</div>
                <div>SCALE 1:100 @ A1</div>
              </div>
              {/* Floorplan mock layout lines */}
              <div className="border border-slate-500/40 h-48 w-full my-auto rounded flex items-center justify-center">
                <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">GROUND FLOOR PLAN — ZONE 2</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">CONFIDENTIAL — FOR SPECIFICATION USE ONLY</div>
            </div>

            {/* Vision AI Detection Pins */}
            {showVisionOverlay && MOCK_DETECTIONS.map((pin) => {
              const isSelected = activePin === pin.id;
              return (
                <div
                  key={pin.id}
                  onClick={() => setActivePin(pin.id)}
                  className="absolute cursor-pointer group"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                >
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono shadow-lg transition-transform ${
                    isSelected ? 'bg-purple-600 text-white scale-110 ring-4 ring-purple-400/40 z-20' : 'bg-slate-800/90 text-purple-300 border border-purple-400/50 hover:scale-105 z-10'
                  }`}>
                    <MapPin className="h-3 w-3 text-purple-300" />
                    <span>{pin.doorNumber} ({pin.fireRating})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right AI Findings Panel */}
      <div className="w-80 bg-white border border-slate-200 rounded-lg flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-800">AI Vision Findings</h3>
          </div>
          <Badge variant="purple">{MOCK_DETECTIONS.length} Detected</Badge>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <Alert variant="info" className="text-xs">
            Vision AI model extracted door schedules and fire rating tags directly from architectural drawings.
          </Alert>

          {MOCK_DETECTIONS.map((item) => {
            const isSelected = activePin === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActivePin(item.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected ? 'border-purple-300 bg-purple-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-800">{item.doorNumber}</span>
                  <ConfidenceBadge level={item.confidence} showLabel={false} />
                </div>
                <div className="mt-2 space-y-1 text-slate-600">
                  <p><span className="font-semibold">Type:</span> {item.type}</p>
                  <p><span className="font-semibold">Fire Rating:</span> {item.fireRating}</p>
                  <p><span className="font-semibold">Confidence:</span> {item.confidenceScore}%</p>
                  <p><span className="font-semibold">Source:</span> {item.source}</p>
                </div>
                <Button
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className="w-full mt-3 h-7 text-xs gap-1"
                  onClick={() => setActivePin(item.id)}
                >
                  <Crosshair className="h-3 w-3" /> View on Drawing
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
