import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiClient";
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
  const [members, setMembers] = useState(null);
  const [selected, setSelected] = useState(null);
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
    localStorage.setItem("active_member_id", selected.id);
    localStorage.setItem("active_member_name", selected.name);
    navigate("/dashboard");
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <div className="w-full max-w-4xl px-6">
        <div className="bg-white rounded-xl p-6 border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Choose a profile</h1>
              <p className="text-sm text-gray-500">Select the person you want to manage.</p>
            </div>
          </div>

          <div className="mt-6">
            {members === null ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <div>No profiles found.</div>
                <div className="mt-4 flex justify-center">
                  <motion.div
                    key="add-profile-empty"
                    onClick={openCreateDialog}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openCreateDialog();
                      }
                    }}
                    whileHover={{ scale: 1.03 }}
                    role="button"
                    tabIndex={0}
                    className="group p-4 rounded-lg text-center transition-shadow border hover:shadow-md flex flex-col items-center justify-center w-48 cursor-pointer"
                  >
                    <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-gray-100 text-teal-500 text-3xl">+
                    </div>
                    <div className="mt-3">
                      <div className="font-medium text-gray-800">Add profile</div>
                      <div className="text-xs text-gray-500">Create a new member</div>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
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
                    whileHover={{ scale: 1.03 }}
                    role="button"
                    tabIndex={0}
                    className={`group relative p-4 rounded-lg text-center transition-shadow border cursor-pointer ${selected?.id === m.id ? 'ring-2 ring-teal-400 bg-teal-50' : 'hover:shadow-md'}`}
                  >
                    {/* edit + delete buttons (top-right) */}
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(m);
                        }}
                        className="bg-white rounded-full p-1 hover:bg-gray-50 border"
                        aria-label={`Edit ${m.name}`}
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingMember(m);
                          setIsAlertOpen(true);
                        }}
                        className="bg-white rounded-full p-1 hover:bg-red-50 border"
                        aria-label={`Delete ${m.name}`}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </button>
                    </div>

                    <div className="mx-auto w-24 h-24">
                      <AvatarImage avatar={m.avatar} className="w-24 h-24 mx-auto rounded-full" />
                    </div>
                    <div className="mt-3">
                      <div className="font-medium text-gray-800">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.relation || m.role || ''}</div>
                    </div>
                  </motion.div>
                ))}
                  {/* Add new profile card */}
                  <motion.div
                    key="add-profile"
                    onClick={openCreateDialog}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openCreateDialog();
                      }
                    }}
                    whileHover={{ scale: 1.03 }}
                    role="button"
                    tabIndex={0}
                    className={`group p-4 rounded-lg text-center transition-shadow border hover:shadow-md flex flex-col items-center justify-center cursor-pointer`}
                  >
                    <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-gray-100 text-teal-500 text-3xl">+
                    </div>
                    <div className="mt-3">
                      <div className="font-medium text-gray-800">Add profile</div>
                      <div className="text-xs text-gray-500">Create a new member</div>
                    </div>
                  </motion.div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={confirm} disabled={!selected} className="bg-teal-500">
              Continue
            </Button>
          </div>
          </div>
        </div>
    </div>

    {/* Add Profile Dialog */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingMember ? "Edit profile" : "Create profile"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Asha Sharma" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Relation / Role</label>
            <Input value={newRelation} onChange={(e) => setNewRelation(e.target.value)} placeholder="e.g. Mother" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
            <AvatarSelector selectedId={newAvatarId} onSelect={(id) => setNewAvatarId(id)} size="sm" />
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!newName.trim()) return;
              const ok = window.confirm(editingMember ? "Save changes to this profile?" : "Create this profile?");
              if (!ok) return;
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
                } else {
                  // Try to create on server; fallback to local creation
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
                }

                setIsDialogOpen(false);
                setEditingMember(null);
                setNewName(''); setNewRelation(''); setNewAvatarId(avatars[0].id);
              } finally {
                setCreating(false);
              }
            }} disabled={creating} className="bg-teal-500">
              {creating ? (editingMember ? 'Saving...' : 'Creating...') : (editingMember ? 'Save' : 'Create')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
  </Dialog>

    {/* Confirm delete Alert */}
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete profile?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="pt-2">
          Are you sure you want to delete {deletingMember?.name}? This action cannot be undone.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setIsAlertOpen(false); setDeletingMember(null); }}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={async () => {
            if (!deletingMember) return;
            try {
              // For locally-created members, skip server call
              if (!String(deletingMember.id).startsWith("local-")) {
                // Try to delete on server
                await api.delete(`/members/${deletingMember.id}`);
              }
              setMembers((prev) => prev.filter((x) => x.id !== deletingMember.id));
              if (selected?.id === deletingMember.id) setSelected(null);
            } catch (err) {
              console.warn('Server delete failed', err);
              window.alert("Delete failed. Please try again.");
              return;
            }

            setDeletingMember(null);
            setIsAlertOpen(false);
          }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
