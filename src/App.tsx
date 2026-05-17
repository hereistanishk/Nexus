import { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  type Unsubscribe 
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogOut, 
  LogIn, 
  LayoutGrid, 
  Search, 
  Globe, 
  ChevronRight, 
  Loader2, 
  Star,
  User as UserIcon,
  Plus,
  ShoppingBag,
  Package,
  ShieldCheck,
  Settings,
  X,
  Palette,
  List,
  Maximize2,
  Focus
} from "lucide-react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy 
} from "@dnd-kit/sortable";

import { auth, db, signInWithGoogle, signOutUser, handleFirestoreError, OperationType } from "./firebase";
import { Site, StoreApp } from "./types";
import SiteCard from "./components/SiteCard";
import SiteViewer from "./components/SiteViewer";
import AddSiteForm from "./components/AddSiteForm";
import ProfileView from "./components/ProfileView";
import AppStore from "./components/AppStore";
import CreatorDashboard from "./components/CreatorDashboard";
import { cn } from "./lib/utils";

type ViewTab = "dashboard" | "store" | "profile" | "creator";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<{ message: string, code?: string } | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingSite, setViewingSite] = useState<Site | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [uiMode, setUiMode] = useState<string>(() => {
    return localStorage.getItem("nexusUiMode") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("nexusUiMode", uiMode);
  }, [uiMode]);

  const isAdmin = user?.email === "studenttanishk2005@gmail.com";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setAuthError({ 
          code: 'auth/unauthorized-domain',
          message: `This domain "${domain}" is not authorized. Please add it to your Firebase Console under Authentication > Settings > Authorized Domains.` 
        });
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError({ message: "Sign-in was cancelled." });
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError({ message: "Popup blocked by browser. Please enable popups to sign in." });
      } else {
        setAuthError({ message: err.message });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Firestore Listener for User Sites
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    if (user) {
      const q = query(
        collection(db, "users", user.uid, "sites"),
        orderBy("order", "asc")
      );

      let isFirstSnapshot = true;

      unsubscribe = onSnapshot(q, async (snapshot) => {
        const sitesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Site[];
        setSites(sitesData);

        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          
          try {
            const path = "defaultApps";
            let defaultAppsSnap;
            try {
              defaultAppsSnap = await getDocs(collection(db, path));
            } catch (err) {
              return;
            }

            const defaultApps = defaultAppsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as StoreApp);
            let orderOffset = sitesData.length;
            
            for (const app of defaultApps) {
              const matchingSites = sitesData.filter(s => s.url === app.downloadURL);
              
              if (matchingSites.length === 0) {
                console.log(`Auto-installing default app: ${app.title}`);
                const siteData: Omit<Site, "id"> = {
                  name: app.title,
                  url: app.downloadURL,
                  icon: app.iconURL || `https://www.google.com/s2/favicons?domain=${new URL(app.downloadURL).hostname}&sz=64`,
                  userId: user.uid,
                  createdAt: serverTimestamp() as any,
                  order: orderOffset++,
                  isFavorite: false,
                  isLocked: true
                };
                try {
                  await addDoc(collection(db, `users/${user.uid}/sites`), siteData);
                } catch (err) {
                  console.error("Error auto-installing:", err);
                }
              } else {
                // If there are duplicates, keep the first one and delete the rest
                const [firstMatch, ...duplicates] = matchingSites;
                
                if (!firstMatch.isLocked) {
                  try {
                    await updateDoc(doc(db, `users/${user.uid}/sites/${firstMatch.id}`), {
                      isLocked: true,
                      updatedAt: serverTimestamp()
                    });
                  } catch(e) {}
                }

                for (const duplicate of duplicates) {
                  try {
                    await deleteDoc(doc(db, `users/${user.uid}/sites/${duplicate.id}`));
                  } catch(e) {}
                }
              }
            }
          } catch (err) {
            console.error("Error verifying default apps:", err);
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/sites`);
      });
    } else {
      setSites([]);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleAddSite = async (name: string, url: string) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, "users", user.uid, "sites"), {
        name,
        url,
        userId: user.uid,
        order: sites.length,
        isFavorite: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error adding site:", err);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "sites", id));
    } catch (err) {
      console.error("Error deleting site:", err);
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "sites", id), {
        isFavorite,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id && user) {
      const oldIndex = sites.findIndex((site) => site.id === active.id);
      const newIndex = sites.findIndex((site) => site.id === over.id);

      const newSites = arrayMove(sites, oldIndex, newIndex) as Site[];
      setSites(newSites);

      // Perform batch update to Firestore
      const batch = writeBatch(db);
      newSites.forEach((site: Site, index: number) => {
        const siteRef = doc(db, "users", user.uid, "sites", site.id);
        batch.update(siteRef, { order: index, updatedAt: serverTimestamp() });
      });

      try {
        await batch.commit();
      } catch (err) {
        console.error("Failed to save new order:", err);
      }
    }
  };

  const filteredSites = useMemo(() => {
    let result = sites.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort favorites to top if there is no specific drag search query
    if (!searchQuery) {
      result = [...result].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return (a.order || 0) - (b.order || 0);
      });
    }

    return result;
  }, [sites, searchQuery]);

  const activeSite = sites.find(s => s.id === activeId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-slate-300 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl group-hover:scale-105 transition-all duration-500">
          <Globe className="text-white w-12 h-12" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-100 tracking-tighter mb-4">
          Nexus
        </h1>
        <p className="text-lg text-slate-400 max-w-md mb-10 leading-relaxed font-medium">
          The unified workspace for your favorite web tools and cloud applications.
        </p>
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="flex items-center gap-3 bg-slate-100 text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          id="login-button"
        >
          {isSigningIn ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
          <span>{isSigningIn ? "Signing in..." : "Sign in with Google"}</span>
        </button>

        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 bg-red-50 border border-red-100 rounded-[2rem] text-red-600 text-sm font-medium max-w-lg shadow-sm"
          >
            <div className="flex flex-col gap-3">
              {authError.code === 'auth/unauthorized-domain' ? (
                <>
                  <p className="font-black flex items-center gap-2">
                    <span className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">!</span>
                    Configuration Required
                  </p>
                  <p className="leading-relaxed opacity-90">{authError.message}</p>
                  <a 
                    href={`https://console.firebase.google.com/project/gen-lang-client-0519464724/authentication/settings`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-center hover:bg-red-700 transition-colors"
                  >
                    Go to Firebase Console
                  </a>
                </>
              ) : (
                <p className="leading-relaxed opacity-90 font-bold">{authError.message}</p>
              )}
            </div>
          </motion.div>
        )}
        <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-2">
          <ChevronRight size={12} />
          Your dashboard is private and secure
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/50">
              <Globe className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-100 tracking-tight">Nexus</h1>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em]">Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Tab Switcher */}
            <div className="hidden md:flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
                  activeTab === "dashboard" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-300"
                )}
              >
                <LayoutGrid size={18} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab("store")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
                  activeTab === "store" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-300"
                )}
              >
                <ShoppingBag size={18} />
                <span>Store</span>
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
                  activeTab === "profile" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-300"
                )}
              >
                <UserIcon size={18} />
                <span>Profile</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveTab("creator")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
                    activeTab === "creator" ? "bg-slate-800 text-purple-400 shadow-sm" : "text-slate-400 hover:text-slate-300"
                  )}
                >
                  <ShieldCheck size={18} />
                  <span>Creator</span>
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-xl border border-slate-800">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm w-32 md:w-64 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden hidden md:block">
                {user.photoURL && <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full" />}
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-2"
                title="Settings"
                id="settings-button"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={signOutUser}
                className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-2"
                title="Sign Out"
                id="logout-button"
              >
                <LogOut size={20} />
                <span className="text-sm font-semibold hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <AddSiteForm onAdd={handleAddSite} />

              {sites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 text-slate-500">
                    <LayoutGrid size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">No sites yet</h2>
                  <p className="text-slate-400 max-w-sm">
                    Add your favorite websites above to turn them into custom web applications.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={filteredSites.map(s => s.id)} strategy={rectSortingStrategy}>
                    <div className={cn(
                      uiMode === "list" 
                        ? "flex flex-col gap-3" 
                        : uiMode === "compact"
                          ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3"
                          : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6"
                    )}>
                      <AnimatePresence mode="popLayout">
                        {filteredSites.map((site) => (
                          <SiteCard
                            key={site.id}
                            site={site}
                            uiMode={uiMode}
                            onOpen={setViewingSite}
                            onDelete={handleDeleteSite}
                            onToggleFavorite={handleToggleFavorite}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </SortableContext>
                  
                  <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                      styles: {
                        active: {
                          opacity: '0.5',
                        },
                      },
                    }),
                  }}>
                    {activeSite ? (
                      <div className="scale-105 shadow-2xl rounded-2xl overflow-hidden pointer-events-none">
                        <SiteCard 
                          site={activeSite} 
                          uiMode={uiMode}
                          onOpen={() => {}} 
                          onDelete={async () => {}} 
                          onToggleFavorite={async () => {}} 
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </motion.div>
          ) : activeTab === "store" ? (
            <motion.div
              key="store"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <AppStore user={user} onInstall={(url, name) => {
                handleAddSite(name, url);
                setActiveTab("dashboard");
              }} />
            </motion.div>
          ) : activeTab === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ProfileView user={user} />
            </motion.div>
          ) : activeTab === "creator" ? (
            <motion.div
              key="creator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CreatorDashboard />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 text-slate-100 rounded-xl flex items-center justify-center shadow-inner">
                      <Settings size={20} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-100 tracking-tight">Settings</h2>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <LayoutGrid size={16} /> UI Layout
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "grid", label: "Grid View", icon: LayoutGrid, desc: "Default grid layout" },
                        { id: "list", label: "List View", icon: List, desc: "Horizontal rows" },
                        { id: "compact", label: "Compact Mode", icon: Focus, desc: "Dense icon grid" },
                        { id: "minimal", label: "Minimalist", icon: Maximize2, desc: "Clean transparent look" }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setUiMode(mode.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 text-center",
                            uiMode === mode.id 
                              ? "border-blue-500 bg-blue-500/10" 
                              : "border-slate-800 hover:bg-slate-800 bg-slate-900"
                          )}
                        >
                          <mode.icon size={24} className={cn("mb-2", uiMode === mode.id ? "text-blue-400" : "text-slate-400")} />
                          <span className={cn(
                            "text-sm font-bold mb-1",
                            uiMode === mode.id ? "text-blue-400" : "text-slate-300"
                          )}>
                            {mode.label}
                          </span>
                          <span className="text-xs text-slate-500">{mode.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800 md:hidden pb-safe">
        <div className="flex items-center justify-around h-20 px-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === "dashboard" ? "text-slate-100" : "text-slate-500"
            )}
          >
            <LayoutGrid size={24} className={cn(activeTab === "dashboard" && "text-blue-400")} />
            <span className="text-[10px] font-black uppercase tracking-widest">Dash</span>
          </button>

          <button
            onClick={() => setActiveTab("store")}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === "store" ? "text-slate-100" : "text-slate-500"
            )}
          >
            <ShoppingBag size={24} className={cn(activeTab === "store" && "text-blue-400")} />
            <span className="text-[10px] font-black uppercase tracking-widest">Store</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === "profile" ? "text-slate-100" : "text-slate-500"
            )}
          >
            <UserIcon size={24} className={cn(activeTab === "profile" && "text-blue-400")} />
            <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab("creator")}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === "creator" ? "text-slate-100" : "text-slate-500"
              )}
            >
              <ShieldCheck size={24} className={cn(activeTab === "creator" && "text-purple-400")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Overlays */}
      <SiteViewer
        site={viewingSite}
        onClose={() => setViewingSite(null)}
      />
    </div>
  );
}
