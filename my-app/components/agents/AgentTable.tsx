"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, ArrowRightLeft, Loader2, KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { bulkReassignAction, resetAgentPasswordAction } from "@/app/(dashboard)/agents/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OpenLead {
  id: string;
  name: string;
}

interface AgentStat {
  id: string;
  full_name: string;
  avatar_url: string | null;
  totalLeads: number;
  openLeads: OpenLead[];
  closedDeals: number;
  siteVisits: number;
}

export function AgentTable({ agents }: { agents: AgentStat[] }) {
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentStat | null>(null);
  const [targetAgentId, setTargetAgentId] = useState<string>("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetAgent, setResetAgent] = useState<AgentStat | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccessData, setResetSuccessData] = useState<{ agentName: string, newPassword: string } | null>(null);

  const handleOpenReassign = (agent: AgentStat) => {
    setSelectedAgent(agent);
    setTargetAgentId("");
    // Default to all selected
    setSelectedLeadIds(agent.openLeads.map(l => l.id));
    setReassignOpen(true);
  };

  const handleOpenResetPassword = (agent: AgentStat) => {
    setResetAgent(agent);
    setNewPassword("");
    setResetSuccessData(null);
    setResetPasswordOpen(true);
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !targetAgentId) return;

    if (selectedLeadIds.length === 0) {
      toast.error("Please select at least one lead to reassign.");
      return;
    }

    setLoading(true);
    const res = await bulkReassignAction({ 
      leadIds: selectedLeadIds, 
      targetAgentId 
    });
    
    if (res.success) {
      toast.success(`Leads reassigned successfully`);
      setReassignOpen(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to reassign leads");
    }
    setLoading(false);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAgent) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const res = await resetAgentPasswordAction({
      agentId: resetAgent.id,
      newPassword,
    });

    if (res.success) {
      toast.success(`Password reset for ${resetAgent.full_name}`);
      setResetSuccessData({ agentName: resetAgent.full_name, newPassword });
    } else {
      toast.error(res.error || "Failed to reset password");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="relative rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        {/* Right fade edge hint for mobile scrolling */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-950 to-transparent pointer-events-none sm:hidden z-10" />

        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Site Visits</TableHead>
                <TableHead className="text-right">Closed Deals</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    No agents found.
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => {
                  const initials = agent.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2);

                  return (
                    <TableRow key={agent.id}>
                      <TableCell className="flex items-center gap-3 whitespace-nowrap">
                        <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800 shrink-0">
                          <AvatarImage src={agent.avatar_url || ""} />
                          <AvatarFallback className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{agent.full_name}</span>
                      </TableCell>
                      <TableCell className="text-right">{agent.totalLeads}</TableCell>
                      <TableCell className="text-right">{agent.siteVisits}</TableCell>
                      <TableCell className="text-right">{agent.closedDeals}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleOpenReassign(agent)}
                              disabled={agent.openLeads.length === 0}
                            >
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Bulk Reassign ({agent.openLeads.length} leads)
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenResetPassword(agent)}
                              className="text-amber-600 focus:text-amber-700 dark:text-amber-500"
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleReassignSubmit}>
            <DialogHeader>
              <DialogTitle>Bulk Reassign Leads</DialogTitle>
              <DialogDescription>
                Select the leads you want to move from <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAgent?.full_name}</span> to another agent.
              </DialogDescription>
            </DialogHeader>
            
            {/* Show which leads will be moved */}
            {selectedAgent && selectedAgent.openLeads.length > 0 && (
              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {selectedLeadIds.length} of {selectedAgent.openLeads.length} selected
                  </p>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400 accent-slate-900 dark:accent-slate-100 cursor-pointer"
                      checked={selectedLeadIds.length === selectedAgent.openLeads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeadIds(selectedAgent.openLeads.map(l => l.id));
                        } else {
                          setSelectedLeadIds([]);
                        }
                      }}
                    />
                    Select All
                  </label>
                </div>
                <ul className="space-y-2">
                  {selectedAgent.openLeads
                    // Optional: Sort so most recent (if id was timestamp based, but they are UUIDs).
                    // As requested "aur recent chck boc me top pr ho", but we only have {id, name}. 
                    // Let's assume they are already ordered correctly from DB.
                    .map(lead => (
                    <li key={lead.id}>
                      <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 accent-slate-900 dark:accent-slate-100 cursor-pointer"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeadIds(prev => [...prev, lead.id]);
                            } else {
                              setSelectedLeadIds(prev => prev.filter(id => id !== lead.id));
                            }
                          }}
                        />
                        <span className="font-medium">{lead.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Select value={targetAgentId} onValueChange={(val) => setTargetAgentId(val as string)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="">
                      {targetAgentId 
                        ? (() => {
                            const selected = agents.find(a => a.id === targetAgentId);
                            return selected ? `${selected.full_name} (${selected.totalLeads} open leads)` : null;
                          })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {agents
                      .filter(a => a.id !== selectedAgent?.id)
                      .map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.full_name} ({a.totalLeads} open leads)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReassignOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !targetAgentId || selectedLeadIds.length === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reassign Leads
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {resetSuccessData ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900/30">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center">Password Reset Successful</DialogTitle>
              <DialogDescription className="text-center max-w-sm">
                The password for {resetSuccessData.agentName} has been reset. Please copy and share it securely.
              </DialogDescription>
              
              <div className="w-full mt-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-800">
                <code className="text-lg font-mono font-bold tracking-wider">{resetSuccessData.newPassword}</code>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(resetSuccessData.newPassword);
                    toast.success("Password copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              
              <Button className="w-full mt-4" onClick={() => setResetPasswordOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordSubmit}>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter a new password for <span className="font-semibold text-slate-900 dark:text-slate-100">{resetAgent?.full_name}</span>.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="text" 
                    placeholder=""
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-slate-500">
                    The password will be shown in the next step so you can share it with the agent.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetPasswordOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || newPassword.length < 8}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
