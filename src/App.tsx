import { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  writeBatch,
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
  Plus
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

import { auth, db, signInWithGoogle, signOutUser } from "./firebase";
import { Site } from "./types";
import SiteCard from "./components/SiteCard";
import SiteViewer from "./components/SiteViewer";
import AddSiteForm from "./components/AddSiteForm";
import ProfileView from "./components/ProfileView";
import { cn } from "./lib/utils";

type ViewTab = "dashboard" | "profile";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingSite, setViewingSite] = useState<Site | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("dashboard");

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
      setAuthError(err.code === 'auth/unauthorized-domain' 
        ? "This domain is not authorized. See console for instructions." 
        : err.message
      );
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

      unsubscribe = onSnapshot(q, (snapshot) => {
        const sitesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Site[];
        setSites(sitesData);
      }, (error) => {
        console.error("Firestore Listen Error:", error);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gray-900 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl">
          <Globe className="text-white w-12 h-12" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
          WebHome Portal
        </h1>
        <p className="text-xl text-gray-500 max-w-md mb-10 leading-relaxed">
          Launch and manage your favorite web sites as a unified workspace.
        </p>
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          id="login-button"
        >
          {isSigningIn ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
          <span>{isSigningIn ? "Signing in..." : "Sign in with Google"}</span>
        </button>

        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium max-w-md"
          >
            {authError}
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
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-md">
              <Globe className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">WebHome</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Tab Switcher */}
            <div className="hidden md:flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
                  activeTab === "dashboard" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <LayoutGrid size={18} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
                  activeTab === "profile" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <UserIcon size={18} />
                <span>Profile</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm w-32 md:w-64 text-gray-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden hidden md:block">
                {user.photoURL && <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full" />}
              </div>
              <button
                onClick={signOutUser}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl flex items-center gap-2"
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
                  <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6 text-gray-400">
                    <LayoutGrid size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No sites yet</h2>
                  <p className="text-gray-500 max-w-sm">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                      <AnimatePresence mode="popLayout">
                        {filteredSites.map((site) => (
                          <SiteCard
                            key={site.id}
                            site={site}
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
          ) : (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ProfileView user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 md:hidden pb-safe">
        <div className="flex items-center justify-around h-20 px-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === "dashboard" ? "text-gray-900" : "text-gray-400"
            )}
          >
            <LayoutGrid size={24} className={cn(activeTab === "dashboard" && "text-blue-600")} />
            <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === "profile" ? "text-gray-900" : "text-gray-400"
            )}
          >
            <UserIcon size={24} className={cn(activeTab === "profile" && "text-blue-600")} />
            <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
          </button>
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
