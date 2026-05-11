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
  onOpen: (site: Site) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
}

export default function SiteCard({ site, onOpen, onDelete, onToggleFavorite }: SiteCardProps) {
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

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4 }}
        className={cn(
          "group relative bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center cursor-pointer",
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
            site.isFavorite ? "text-yellow-500 bg-yellow-50" : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50 opacity-100 sm:opacity-0 group-hover:opacity-100"
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
          className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-gray-600 transition-opacity cursor-grab active:cursor-grabbing opacity-100 sm:opacity-0 group-hover:opacity-100 rounded-lg"
          id={`drag-handle-${site.id}`}
        >
          <GripVertical size={16} />
        </div>

        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-inner border border-gray-100 group-hover:bg-white transition-colors">
          {imgSrc && !hasError ? (
            <img 
              src={imgSrc} 
              alt={site.name} 
              className="w-10 h-10 object-contain" 
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          ) : (
            <Globe className="w-8 h-8 text-gray-400" />
          )}
        </div>
        
        <h3 className="font-semibold text-gray-900 truncate w-full px-2" title={site.name}>
          {site.name}
        </h3>
        <p className="text-xs text-gray-500 truncate w-full mt-1 opacity-70">
          {new URL(site.url).hostname}
        </p>

        {/* Action Bar (at bottom) */}
        <div className="mt-4 flex gap-2 w-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(site.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 py-1.5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg border border-transparent hover:border-red-100"
            title="Delete bookmark"
            id={`delete-btn-${site.id}`}
          >
            <Trash2 size={14} />
          </button>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 py-1.5 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors rounded-lg border border-transparent hover:border-blue-100"
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
