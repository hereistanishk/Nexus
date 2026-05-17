import React, { useState, useEffect } from "react";
import { 
  Download, 
  Plus, 
  Search, 
  Star, 
  ExternalLink, 
  Smartphone, 
  Globe, 
  ChevronRight,
  ShieldCheck,
  UploadCloud,
  X,
  Loader2,
  Package,
  Layers,
  Gamepad2,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  updateDoc,
  doc,
  increment,
  increment as firestoreIncrement
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase";
import { StoreApp, Site } from "../types";
import { cn } from "../lib/utils";

interface AppStoreProps {
  user: User;
  onInstall?: (url: string, name: string) => void;
}

export default function AppStore({ user, onInstall }: AppStoreProps) {
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Upload Form State
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "web" as StoreApp["category"],
    downloadURL: "",
    iconURL: "",
    isAPK: false
  });

  useEffect(() => {
    const q = query(collection(db, "appStore"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as StoreApp));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.title || !uploadData.downloadURL) return;

    setIsUploading(true);
    try {
      const newApp: Omit<StoreApp, "id"> = {
        title: uploadData.title,
        description: uploadData.description,
        developerId: user.uid,
        developerName: user.displayName || "Anonymous",
        category: uploadData.category,
        downloadURL: uploadData.downloadURL,
        iconURL: uploadData.iconURL || `https://ui-avatars.com/api/?name=${uploadData.title}&background=random`,
        isAPK: uploadData.category === "apk",
        downloads: 0,
        rating: 5,
        createdAt: serverTimestamp() as any
      };
      await addDoc(collection(db, "appStore"), newApp);
      setShowUploadModal(false);
      setUploadData({ title: "", description: "", category: "web", downloadURL: "", iconURL: "", isAPK: false });
    } catch (err) {
      console.error("Error uploading app:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (appId: string, url: string, isAPK: boolean) => {
    try {
      await updateDoc(doc(db, "appStore", appId), {
        downloads: firestoreIncrement(1)
      });
      
      if (!isAPK && onInstall) {
        const app = apps.find(a => a.id === appId);
        if (app) onInstall(url, app.title);
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error("Error updating download count:", err);
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || app.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 space-y-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight flex items-center gap-3">
             <Package className="text-blue-500" size={40} />
             Nexus Play Store
          </h1>
          <p className="text-slate-400 font-medium mt-2">Discover, download, and share community apps.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl pl-12 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            <UploadCloud size={20} />
            <span className="hidden sm:inline">Publish App</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "all", label: "All Apps", icon: Layers },
          { id: "utility", label: "Utilities", icon: Cpu },
          { id: "game", label: "Games", icon: Gamepad2 },
          { id: "web", label: "Web Tools", icon: Globe },
          { id: "apk", label: "Android APKs", icon: Smartphone },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap active:scale-95",
              activeCategory === cat.id 
                ? "bg-slate-100 text-slate-900 shadow-xl translate-y-[-2px]" 
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800"
            )}
          >
            <cat.icon size={18} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredApps.map((app) => (
          <motion.div
            layout
            key={app.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-slate-900 rounded-[2.5rem] border border-slate-800 p-6 hover:shadow-2xl hover:border-slate-700 transition-all cursor-default"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center p-3 group-hover:bg-slate-700 transition-colors">
                <img 
                  src={app.iconURL} 
                  alt={app.title} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${app.title}&background=random`;
                  }}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-100 line-clamp-1">{app.title}</h3>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">{app.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-black text-slate-500">{app.rating} · {app.downloads} downloads</span>
                </div>
              </div>
            </div>

            <p className="text-slate-400 text-sm font-medium line-clamp-3 mb-6 h-15">
              {app.description || "No description provided."}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
               <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Developer</span>
                  <span className="text-xs font-bold text-slate-300">{app.developerName}</span>
               </div>

               <button
                 onClick={() => handleDownload(app.id, app.downloadURL, app.isAPK)}
                 className={cn(
                   "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95",
                   app.isAPK 
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white" 
                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white"
                 )}
               >
                 {app.isAPK ? <Smartphone size={16} /> : <Download size={16} />}
                 <span>{app.isAPK ? "Get APK" : "Install"}</span>
               </button>
            </div>
          </motion.div>
        ))}

        {filteredApps.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-800">
            <Package className="w-16 h-16 mx-auto text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No apps found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Try searching for something else or be the first to publish an app!</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onSubmit={handleUpload}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-100">Publish to Store</h3>
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)} 
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl transition-colors"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">App Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="E.g. My Amazing Game"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 mt-1 font-bold text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Category</label>
                  <select 
                    value={uploadData.category}
                    onChange={(e) => setUploadData({...uploadData, category: e.target.value as any})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 mt-1 font-bold text-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="web">Web Application</option>
                    <option value="apk">Android APK</option>
                    <option value="game">Game</option>
                    <option value="utility">Utility</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Download/Web URL</label>
                  <input 
                    required
                    type="url" 
                    placeholder="https://..."
                    value={uploadData.downloadURL}
                    onChange={(e) => setUploadData({...uploadData, downloadURL: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 mt-1 font-bold text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Short Description</label>
                  <textarea 
                    rows={3}
                    placeholder="What does your app do?"
                    value={uploadData.description}
                    onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 mt-1 font-medium text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-blue-600 text-white py-4 rounded-[2rem] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="animate-spin mx-auto" /> : "Publish Now"}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
