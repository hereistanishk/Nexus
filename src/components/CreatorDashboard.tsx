import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Settings, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Package, 
  ArrowRight,
  Loader2,
  Users
} from "lucide-react";
import { motion } from "motion/react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { StoreApp } from "../types";
import { cn } from "../lib/utils";

export default function CreatorDashboard() {
  const [storeApps, setStoreApps] = useState<StoreApp[]>([]);
  const [defaultAppIds, setDefaultAppIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to all apps in store
    const storeUnsubscribe = onSnapshot(collection(db, "appStore"), (snapshot) => {
      setStoreApps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as StoreApp));
    });

    // Listen to default apps
    const defaultUnsubscribe = onSnapshot(collection(db, "defaultApps"), (snapshot) => {
      setDefaultAppIds(new Set(snapshot.docs.map(doc => doc.id)));
      setLoading(false);
    });

    return () => {
      storeUnsubscribe();
      defaultUnsubscribe();
    };
  }, []);

  const toggleDefault = async (app: StoreApp) => {
    const isDefault = defaultAppIds.has(app.id);
    const defaultRef = doc(db, "defaultApps", app.id);

    try {
      if (isDefault) {
        await deleteDoc(defaultRef);
      } else {
        await setDoc(defaultRef, {
          ...app,
          isDefault: true // Just a marker
        });
      }
    } catch (err) {
      console.error("Error toggling default status:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Creator Console</h1>
            <p className="text-gray-500 font-medium">Manage platform-wide settings and default applications.</p>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
              <Package size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-900">Pre-installed Apps</h2>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-black uppercase tracking-widest">
            <Users size={14} />
            <span>Applies to all users</span>
          </div>
        </div>

        <div className="space-y-4">
          {storeApps.map((app) => {
            const isDefault = defaultAppIds.has(app.id);
            return (
              <div 
                key={app.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  isDefault ? "bg-purple-50/50 border-purple-100" : "bg-gray-50/50 border-transparent hover:border-gray-200"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center p-2 shadow-sm">
                    <img src={app.iconURL} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900">{app.title}</h3>
                    <p className="text-xs text-gray-500 font-medium">by {app.developerName}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleDefault(app)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95",
                    isDefault 
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200" 
                      : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {isDefault ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  <span>{isDefault ? "Pre-installed" : "Set Default"}</span>
                </button>
              </div>
            );
          })}

          {storeApps.length === 0 && (
            <div className="text-center py-12 text-gray-400 font-medium italic">
              No apps available in store yet.
            </div>
          )}
        </div>
      </section>

      <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-sm">
          <h2 className="text-2xl font-black">Creator Insights</h2>
          <p className="text-gray-400 text-sm font-medium leading-relaxed">
            Default apps are automatically added to every user's dashboard when they sign in if they don't have them installed yet.
          </p>
          <div className="pt-4 flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-black">{storeApps.length}</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Apps in Store</span>
            </div>
            <div className="w-[1px] h-8 bg-gray-700" />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-purple-400">{defaultAppIds.size}</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Default Apps</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full" />
      </section>
    </div>
  );
}
