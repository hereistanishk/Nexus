import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  Mail, 
  MapPin, 
  Github, 
  Linkedin, 
  Globe, 
  Edit3, 
  Plus, 
  Trash2, 
  ExternalLink,
  Save,
  X,
  Briefcase,
  Camera,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { User } from "firebase/auth";
import { auth, db } from "../firebase";
import { Profile, PortfolioItem } from "../types";
import { cn } from "../lib/utils";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ProfileViewProps {
  user: User;
}

export default function ProfileView({ user }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    headline: "Full Stack Developer",
    bio: "I build amazing web applications...",
    location: "Global",
    photoURL: user.photoURL || "",
    email: user.email || "",
    github: "",
    linkedin: "",
    website: ""
  });

  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    url: ""
  });

  useEffect(() => {
    // Fetch Profile
    const profileRef = doc(db, "profiles", user.uid);
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Profile;
          setProfile(data);
          setFormData({
            displayName: data.displayName,
            headline: data.headline,
            bio: data.bio,
            location: data.location || "",
            photoURL: data.photoURL,
            email: data.email,
            github: data.socialLinks?.github || "",
            linkedin: data.socialLinks?.linkedin || "",
            website: data.socialLinks?.website || ""
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `profiles/${user.uid}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Fetch Portfolio
    const portfolioPath = `users/${user.uid}/portfolio`;
    const q = query(
      collection(db, portfolioPath),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPortfolio(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PortfolioItem));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, portfolioPath);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const path = `profiles/${user.uid}`;
    try {
      const profileData: Omit<Profile, "id"> = {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
        bio: formData.bio,
        headline: formData.headline,
        email: formData.email,
        location: formData.location,
        socialLinks: {
          github: formData.github,
          linkedin: formData.linkedin,
          website: formData.website
        }
      };
      await setDoc(doc(db, path), profileData);
      setProfile({ id: user.uid, ...profileData });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.url) return;

    const path = `users/${user.uid}/portfolio`;
    try {
      await addDoc(collection(db, path), {
        ...newProject,
        createdAt: serverTimestamp()
      });
      setNewProject({ title: "", description: "", url: "" });
      setShowAddProject(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const path = `users/${user.uid}/portfolio/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20" id="profile-page">
      {/* Hero Section */}
      <section className="relative bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-800 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500/20 to-purple-600/20 opacity-30" />
        
        <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="relative group">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-slate-800 shadow-xl overflow-hidden bg-slate-800">
              <img 
                src={formData.photoURL || `https://ui-avatars.com/api/?name=${formData.displayName}&background=random&size=200`} 
                alt={formData.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            {isEditing && (
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white cursor-pointer rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} />
                <input 
                  type="text" 
                  hidden 
                  value={formData.photoURL}
                  onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
                  placeholder="Photo URL"
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="text-3xl md:text-4xl font-black text-slate-100 bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 px-2"
                  />
                ) : (
                  <h1 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight">
                    {formData.displayName}
                  </h1>
                )}
                
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.headline}
                    onChange={(e) => setFormData({...formData, headline: e.target.value})}
                    placeholder="Headline"
                    className="block mt-2 text-lg text-blue-400 font-bold bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 px-2 w-full"
                  />
                ) : (
                  <p className="text-lg text-blue-400 font-bold mt-1">
                    {formData.headline}
                  </p>
                )}
              </div>

              <button
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                disabled={saving}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-sm active:scale-95",
                  isEditing ? "bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white" : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                )}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : isEditing ? <Save size={18} /> : <Edit3 size={18} />}
                <span>{isEditing ? (saving ? "Saving..." : "Save Changes") : "Edit Profile"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span>{formData.email}</span>
              </div>
              {formData.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{formData.location}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {(formData.github || isEditing) && (
                <a href={formData.github || "#"} className="p-2 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all">
                  <Github size={20} />
                </a>
              )}
              {(formData.linkedin || isEditing) && (
                <a href={formData.linkedin || "#"} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all">
                  <Linkedin size={20} />
                </a>
              )}
              {(formData.website || isEditing) && (
                <a href={formData.website || "#"} className="p-2 text-slate-500 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-all">
                  <Globe size={20} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xs uppercase tracking-widest font-black text-slate-500 mb-4 px-1">About Me</h2>
          {isEditing ? (
            <textarea 
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              rows={4}
              className="w-full bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 p-4 text-slate-300 leading-relaxed font-medium outline-none"
            />
          ) : (
            <p className="text-slate-400 leading-relaxed font-medium text-lg">
              {formData.bio}
            </p>
          )}
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Portfolio</h2>
          </div>
          <button
            onClick={() => setShowAddProject(!showAddProject)}
            className="flex items-center gap-2 bg-slate-800 text-slate-100 px-5 py-2.5 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-95 shadow-md"
          >
            <Plus size={18} />
            <span>Add Project</span>
          </button>
        </div>

        <AnimatePresence>
          {showAddProject && (
            <motion.form
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleAddProject}
              className="bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-800 shadow-xl space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Project Title"
                  value={newProject.title}
                  onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  className="bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <input 
                  type="url" 
                  placeholder="Project URL (https://...)"
                  value={newProject.url}
                  onChange={(e) => setNewProject({...newProject, url: e.target.value})}
                  className="bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <textarea 
                placeholder="Brief description of your work..."
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                rows={2}
                className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 font-medium text-slate-300 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddProject(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                >
                  Create Project
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portfolio.map((project) => (
            <motion.div
              layout
              key={project.id}
              className="group bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-800 hover:shadow-xl hover:border-slate-700 transition-all cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-slate-600 transition-colors">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${new URL(project.url).hostname}&sz=64`}
                    alt=""
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${project.title}&background=random`;
                    }}
                  />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDeleteProject(project.id)}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-100 group-hover:text-blue-400 transition-colors">
                {project.title}
              </h3>
              <p className="text-slate-400 font-medium text-sm mt-2 line-clamp-2">
                {project.description}
              </p>
              
              <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                  {new URL(project.url).hostname}
                </p>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                >
                  <span>View Project</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          ))}

          {portfolio.length === 0 && !showAddProject && (
            <div className="col-span-full py-16 text-center bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-800">
               <Briefcase size={40} className="mx-auto text-slate-700 mb-4" />
               <p className="text-slate-500 font-bold">Showcase the apps you've built here!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
