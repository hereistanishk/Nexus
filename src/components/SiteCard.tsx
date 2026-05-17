import { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Trash2, Globe, Star, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Site } from "../types";
import { getFavicon, getFallbackFavicon, cn } from "../lib/utils";

interface SiteCardProps {
  key?: string | number;
  site: Site;
  uiMode?: string;
  onOpen: (site: Site) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
}

export default function SiteCard({ site, uiMode = "grid", onOpen, onDelete, onToggleFavorite }: SiteCardProps) {
  const [imgSrc, setImgSrc] = useState(site.icon || getFavicon(site.url));
  const [hasError, setHasError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: site.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      const fallback = getFallbackFavicon(site.url);
      if (fallback) setImgSrc(fallback);
    }
  };

  if (uiMode === "list") {
    return (
      <div ref={setNodeRef} style={style} className={cn("relative w-full", isDragging && "z-50")}>
        <motion.div
          layout
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className={cn(
            "group relative bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-slate-700 transition-all duration-300 flex items-center gap-4 cursor-pointer",
            isDragging && "opacity-50"
          )}
          onClick={() => !isDragging && onOpen(site)}
          id={`site-card-list-${site.id}`}
        >
          {/* Drag Handle left for list */}
          <div
            {...attributes}
            {...listeners}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-2 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
            id={`drag-handle-${site.id}`}
          >
            <GripVertical size={16} />
          </div>

          <div className="w-10 h-10 shrink-0 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
            {imgSrc && !hasError ? (
              <img src={imgSrc} alt={site.name} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" onError={handleImageError} />
            ) : <Globe className="w-5 h-5 text-slate-500" />}
          </div>
          
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="text-left max-w-full">
              <h3 className="font-bold text-slate-100 truncate w-full pr-4">{site.name}</h3>
              <p className="text-xs text-slate-500 truncate w-full">{new URL(site.url).hostname}</p>
            </div>
            
            <div className="flex items-center gap-3 pr-2">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(site.id, !site.isFavorite); }}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn("p-1.5 transition-all rounded-md opacity-100 sm:opacity-0 group-hover:opacity-100", site.isFavorite ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400")}
              >
                <Star size={16} fill={site.isFavorite ? "currentColor" : "none"} />
              </button>

              {!site.isLocked && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(site.id); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-md opacity-100 sm:opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <a
                href={site.url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                className="p-1.5 text-slate-600 hover:text-blue-400 transition-colors rounded-md opacity-100 sm:opacity-0 group-hover:opacity-100"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (uiMode === "compact") {
    return (
      <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            "group relative bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:bg-slate-800 transition-all flex flex-col items-center justify-center cursor-pointer aspect-square",
            isDragging && "opacity-50"
          )}
          onClick={() => !isDragging && onOpen(site)}
        >
          <div
            {...attributes}
            {...listeners}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-1 right-1 p-1 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-100 sm:opacity-0 group-hover:opacity-100 z-10"
          >
            <GripVertical size={12} />
          </div>

          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-700 shadow-inner group-hover:bg-slate-700 transition-colors mb-2">
            {imgSrc && !hasError ? (
              <img src={imgSrc} alt={site.name} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" onError={handleImageError} />
            ) : <Globe className="w-6 h-6 text-slate-500" />}
          </div>
          <p className="text-[10px] font-bold text-slate-300 truncate w-full text-center px-1 group-hover:text-slate-100">
            {site.name}
          </p>
        </motion.div>
      </div>
    );
  }

  // Default "grid" and "minimal" (minimal will just lack background in another layer maybe, but let's reuse grid layout and apply transparent bg)
  // Let minimal override bg:
  const isMinimal = uiMode === "minimal";

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4 }}
        className={cn(
          "group relative rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all duration-300",
          isMinimal ? "p-3 hover:bg-slate-900/50" : "bg-slate-900 border border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-slate-700",
          isDragging && "opacity-50"
        )}
        onClick={() => !isDragging && onOpen(site)}
        id={`site-card-${site.id}`}
      >
        {/* Favorite Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(site.id, !site.isFavorite);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-3 left-3 p-1.5 transition-all rounded-lg z-10",
            site.isFavorite ? "text-yellow-400 bg-yellow-400/10" : "text-slate-600 hover:text-yellow-400 hover:bg-yellow-400/10 opacity-100 sm:opacity-0 group-hover:opacity-100"
          )}
          id={`favorite-btn-${site.id}`}
        >
          <Star size={16} fill={site.isFavorite ? "currentColor" : "none"} />
        </button>

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 p-1.5 text-slate-600 hover:text-slate-400 transition-opacity cursor-grab active:cursor-grabbing opacity-100 sm:opacity-0 group-hover:opacity-100 rounded-lg"
          id={`drag-handle-${site.id}`}
        >
          <GripVertical size={16} />
        </div>

        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-inner border border-slate-700 group-hover:bg-slate-700 transition-colors">
          {imgSrc && !hasError ? (
            <img 
              src={imgSrc} 
              alt={site.name} 
              className="w-10 h-10 object-contain" 
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          ) : (
            <Globe className="w-8 h-8 text-slate-500" />
          )}
        </div>
        
        <h3 className="font-semibold text-slate-100 truncate w-full px-2" title={site.name}>
          {site.name}
        </h3>
        <p className="text-xs text-slate-500 truncate w-full mt-1 opacity-70">
          {new URL(site.url).hostname}
        </p>

        {/* Action Bar (at bottom) */}
        <div className="mt-4 flex gap-2 w-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {!site.isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(site.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 py-1.5 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors rounded-lg border border-transparent hover:border-red-400/20"
              title="Delete bookmark"
              id={`delete-btn-${site.id}`}
            >
              <Trash2 size={14} />
            </button>
          )}
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 py-1.5 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors rounded-lg border border-transparent hover:border-blue-400/20"
            title="Open in new tab"
            id={`external-link-${site.id}`}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
