import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiClient";
import { useActiveMember } from "@/lib/ActiveMemberContext";
import { createPageUrl } from "@/utils";
import { AvatarImage, avatars } from "@/components/ui/AvatarSelector";
import AvatarSelector from "@/components/ui/AvatarSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Trash, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function ProfileSelector() {
  const navigate = useNavigate();
  const { setActiveMember, clearActiveMember, refreshMembers } = useActiveMember();
  const [members, setMembers] = useState(null);
  const [selected, setSelected] = useState(null);

  /** Sentinel for "Me" (logged-in user's own profile) */
  const ME_PROFILE = { id: "me", name: "Me", isMe: true };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newAvatarId, setNewAvatarId] = useState(avatars[0].id);
  const [creating, setCreating] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const { data } = await api.get("/members");
        setMembers(data || []);
        if (data && data.length === 1) {
          // Auto-select single member
          setSelected(data[0]);
        }
      } catch (err) {
        console.error("Failed to load members:", err);
        setMembers([]);
      }
    };
    loadMembers();
  }, []);

  const selectMember = (member) => {
    setSelected(member);
  };

  const confirm = () => {
    if (!selected) return;
    if (selected.isMe) {
      clearActiveMember();
    } else {
      setActiveMember(selected);
    }
    navigate(createPageUrl("dashboard"));
  };

  const openCreateDialog = () => {
    setEditingMember(null);
    setNewName("");
    setNewRelation("");
    setNewAvatarId(avatars[0].id);
    setIsDialogOpen(true);
  };

  const openEditDialog = (member) => {
    setEditingMember(member);
    setNewName(member.name || "");
    setNewRelation(member.relation || member.role || "");
    setNewAvatarId(member.avatar || avatars[0].id);
    setIsDialogOpen(true);
  };

  return (
    <>
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100 flex items-center justify-center py-10">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="w-full max-w-5xl px-6 relative z-10">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-xl shadow-gray-200/50 p-8 md:p-12 text-center"
        >
          <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Who is using MediSaathi?</h1>
              <p className="text-lg text-gray-500 font-medium">Select a profile to manage health records</p>
          </div>

          <div className="mt-8">
            {members === null ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-8">
                {/* Me (own profile) */}
                <motion.div
                  key="profile-me"
                  onClick={() => selectMember(ME_PROFILE)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectMember(ME_PROFILE); } }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  role="button"
                  tabIndex={0}
                  className={`group relative w-40 flex flex-col items-center cursor-pointer outline-none`}
                >
                  <div className={`
                    w-32 h-32 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-lg transition-all duration-300
                    ${selected?.isMe 
                        ? "bg-teal-500 text-white ring-4 ring-teal-200 ring-offset-4" 
                        : "bg-teal-100 text-teal-700 hover:shadow-teal-500/20 hover:bg-teal-200"
                    }
                  `}>
                      Me
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors">Me</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Primary</div>
                  </div>
                </motion.div>

                {/* Family Members */}
                {members.map((m) => (
                  <motion.div
                    key={m.id}
                    onClick={() => selectMember(m)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectMember(m);
                      }
                    }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    role="button"
                    tabIndex={0}
                    className="group relative w-40 flex flex-col items-center cursor-pointer outline-none"
                  >
                    {/* Hover Actions */}
                    <div className="absolute -top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(m);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingMember(m);
                          setIsAlertOpen(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Profile"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className={`
                        relative w-32 h-32 rounded-full p-1 border-2 transition-all duration-300 shadow-lg group-hover:shadow-xl
                        ${selected?.id === m.id 
                            ? 'border-teal-500 ring-4 ring-teal-200 ring-offset-2' 
                            : 'border-transparent bg-white group-hover:border-gray-200'
                        }
                    `}>
                        <AvatarImage avatar={m.avatar} className="w-full h-full rounded-full" />
                    </div>
                    
                    <div className="mt-4 text-center">
                      <div className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors truncate w-36 px-2">{m.name}</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 truncate w-36 px-2">{m.relation || m.role || 'Family'}</div>
                    </div>
                  </motion.div>
                ))}

                  {/* Add new profile button */}
                  <motion.div
                    key="add-profile"
                    onClick={openCreateDialog}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    role="button"
                    tabIndex={0}
                    className="group relative w-40 flex flex-col items-center cursor-pointer outline-none"
                  >
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-4xl text-gray-300 group-hover:border-teal-400 group-hover:text-teal-500 group-hover:bg-teal-50 transition-all duration-300">
                        +
                    </div>
                    <div className="mt-4 text-center">
                      <div className="text-lg font-bold text-gray-400 group-hover:text-teal-600 transition-colors">Add Profile</div>
                    </div>
                  </motion.div>
              </div>
            )}
          </div>

          <div className="mt-16 flex justify-center">
            {selected && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Button 
                        onClick={confirm} 
                        className="h-14 px-10 text-lg rounded-2xl bg-gray-900 hover:bg-black text-white font-bold shadow-xl shadow-gray-900/20"
                    >
                        Continue as {selected.name}
                    </Button>
                </motion.div>
            )}
            {!selected && members && members.length > 0 && (
                 <p className="text-gray-400 font-medium">Select a profile to continue</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
    
    {/* ------------------ DIALOGS ------------------ */}

    {/* Add/Edit Profile Dialog */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20 p-8 rounded-[2rem] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-gray-900 text-center">
            {editingMember ? "Edit Profile" : "Create Profile"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full name</label>
            <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Asha Sharma" 
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Relation / Role</label>
            <Input 
                value={newRelation} 
                onChange={(e) => setNewRelation(e.target.value)} 
                placeholder="e.g. Mother" 
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-lg"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Choose Avatar</label>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <AvatarSelector selectedId={newAvatarId} onSelect={(id) => setNewAvatarId(id)} size="sm" />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold text-gray-500 hover:bg-gray-100 h-12">Cancel</Button>
            <Button 
                onClick={async () => {
                if (!newName.trim()) return;
                // ... same logic as before ...
                setCreating(true);
                try {
                    const payload = { name: newName.trim(), relation: newRelation.trim(), avatar: newAvatarId };

                    if (editingMember) {
                    let updated;
                    try {
                        const res = await api.put(`/members/${editingMember.id}`, payload);
                        updated = res.data;
                    } catch (err) {
                        console.warn("Update member failed, updating locally", err);
                        updated = { ...editingMember, ...payload };
                    }

                    setMembers((prev) => prev.map((m) => (m.id === editingMember.id ? updated : m)));
                    if (selected?.id === editingMember.id) setSelected(updated);
                    refreshMembers();
                    } else {
                    let created;
                    try {
                        const res = await api.post('/members', payload);
                        created = res.data;
                    } catch (err) {
                        console.warn('Create member failed, creating locally', err);
                        created = { id: `local-${Date.now()}`, name: payload.name, relation: payload.relation, avatar: payload.avatar };
                    }

                    setMembers((prev) => [...prev, created]);
                    setSelected(created);
                    refreshMembers();
                    }

                    setIsDialogOpen(false);
                    setEditingMember(null);
                    setNewName(''); setNewRelation(''); setNewAvatarId(avatars[0].id);
                } finally {
                    setCreating(false);
                }
                }} 
                disabled={creating} 
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl h-12 px-6 flex-1 sm:flex-none"
            >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingMember ? 'Save Changes' : 'Create Profile')}
            </Button>
        </DialogFooter>
      </DialogContent>
  </Dialog>

    {/* Confirm delete Alert */}
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogContent className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-8 border-white/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold text-gray-900 text-center">Delete profile?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-center text-gray-500 font-medium text-lg pt-2 leading-relaxed">
          Are you sure you want to delete <span className="text-gray-900 font-bold">{deletingMember?.name}</span>?<br />
          This action cannot be undone.
        </AlertDialogDescription>
        <AlertDialogFooter className="mt-8 justify-center gap-4 sm:justify-center">
          <AlertDialogCancel onClick={() => { setIsAlertOpen(false); setDeletingMember(null); }} className="h-12 rounded-xl font-bold border-gray-200">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-red-500 hover:bg-red-600 text-white font-bold h-12 rounded-xl px-8"
            onClick={async () => {
            if (!deletingMember) return;
            try {
              if (!String(deletingMember.id).startsWith("local-")) {
                await api.delete(`/members/${deletingMember.id}`);
              }
              setMembers((prev) => prev.filter((x) => x.id !== deletingMember.id));
              if (selected?.id === deletingMember.id) setSelected(null);
              refreshMembers();
            } catch (err) {
              console.warn('Server delete failed', err);
              window.alert("Delete failed. Please try again.");
              return;
            }
            setDeletingMember(null);
            setIsAlertOpen(false);
          }}>Delete Profile</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
