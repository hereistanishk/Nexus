import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, AlertCircle, RefreshCw, Smartphone } from "lucide-react";
import { Site } from "../types";

interface SiteViewerProps {
  site: Site | null;
  onClose: () => void;
}

export default function SiteViewer({ site, onClose }: SiteViewerProps) {
  if (!site) return null;

  // Modern major sites usually block iframe embedding via X-Frame-Options
  const hostname = new URL(site.url).hostname.toLowerCase();
  const isEmbedBlocked = 
    hostname.includes("youtube.com") || 
    hostname.includes("github.com") ||
    hostname.includes("instagram.com") || 
    hostname.includes("facebook.com") || 
    hostname.includes("google.com") ||
    hostname.includes("amazon.com") ||
    hostname.includes("twitter.com") ||
    hostname.includes("x.com") ||
    hostname.includes("linkedin.com") ||
    hostname.includes("reddit.com");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 md:p-8"
        id="site-viewer-overlay"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full h-full max-w-6xl bg-white rounded-[2rem] overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-white/20"
          id="site-viewer-container"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-8 py-5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`} 
                  alt="" 
                  className="w-8 h-8 object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${site.name}&background=random&size=128`;
                  }}
                />
              </div>
              <div className="flex flex-col">
                <h2 className="font-extrabold text-xl text-gray-900 truncate leading-none">{site.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   <p className="text-xs text-gray-400 truncate font-mono uppercase tracking-widest font-bold">
                    {hostname}
                   </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all rounded-2xl active:scale-90"
                id="site-viewer-close-btn"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-gray-50 relative overflow-hidden flex flex-col">
            {isEmbedBlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center bg-gradient-to-b from-gray-50 to-white">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] bg-white shadow-2xl border border-gray-100 flex items-center justify-center mb-10 relative"
                >
                   <img 
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=256`} 
                    alt="" 
                    className="w-16 h-16 md:w-24 md:h-24 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                    <ExternalLink size={20} strokeWidth={3} />
                  </div>
                </motion.div>

                <h3 className="text-2xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
                  Launch the Official App
                </h3>
                <p className="text-gray-500 max-w-md text-base md:text-lg mb-10 leading-relaxed font-medium">
                  Platforms like <span className="text-gray-900 font-bold">{site.name}</span> block previewing inside other apps for your privacy and security.
                </p>

                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-4 px-10 py-5 bg-gray-900 text-white font-black text-xl rounded-full hover:bg-black transition-all shadow-[0_20px_35px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_45px_-12px_rgba(0,0,0,0.4)] active:scale-95 overflow-hidden"
                  id="site-launch-primary"
                >
                  <span className="relative z-10">Open {site.name}</span>
                  <ExternalLink size={24} strokeWidth={3} className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>

                <div className="mt-12 flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-2xl text-xs font-bold ring-1 ring-blue-100">
                  <Smartphone size={16} />
                  <span>Best experience in the native application</span>
                </div>
              </div>
            ) : (
              <>
                <iframe
                  src={site.url}
                  className="w-full h-full border-none bg-white"
                  title={site.name}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  id="site-viewer-iframe"
                />
                
                {/* Float Action Button */}
                <div className="absolute bottom-6 right-6">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-black text-sm rounded-2xl shadow-2xl hover:bg-gray-50 transition-all border border-gray-100 active:scale-95"
                  >
                    <span>Full Screen</span>
                    <ExternalLink size={16} />
                  </a>
                </div>

                {/* Status Bar */}
                <div className="absolute bottom-6 left-6 pointer-events-none">
                  <div className="bg-gray-900/90 backdrop-blur text-white/90 text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-lg uppercase border border-white/10">
                    Live Session Active
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
