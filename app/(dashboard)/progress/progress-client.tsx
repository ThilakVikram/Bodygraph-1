"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import {
  createProgressRecordAction,
  updateProgressRecordAction,
  deleteProgressRecordAction,
} from "@/lib/actions/progress";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartCard } from "@/components/charts/chart-card";
import { ProgressChart } from "@/components/charts/progress-chart";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

type Option = { id: string; name: string };

type RecordRow = {
  id: string;
  recordDate: string;
  weight: number | null;
  bodyFatPercent: number | null;
  height: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  notes: string | null;
  photoUrl: string | null;
};

export function ProgressClient({
  canManage,
  members,
  selectedMemberId,
  records,
}: {
  canManage: boolean;
  members?: Option[];
  selectedMemberId?: string;
  records: RecordRow[];
}) {
  const dialogRef = useRef<DialogHandle>(null);
  const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
  // Bumped on every dialog open to force a fresh mount, so a previous submission's
  // field values / success state never leak into the next add/edit.
  const [recordNonce, setRecordNonce] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  function openAdd() {
    setEditingRecord(null);
    setRecordNonce((n) => n + 1);
    dialogRef.current?.open();
  }

  function openEdit(record: RecordRow) {
    setEditingRecord(record);
    setRecordNonce((n) => n + 1);
    dialogRef.current?.open();
  }

  async function handleDelete(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    const result = await deleteProgressRecordAction(initialActionState, fd);
    if (result.error) {
      toast({ title: "Couldn't delete record", description: result.error, variant: "error" });
    } else {
      router.refresh();
    }
  }

  const chartData = [...records]
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
    .map((r) => ({ date: formatDate(r.recordDate), weight: r.weight }));

  const photos = records.filter((r) => r.photoUrl);

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MemberPicker members={members ?? []} selectedMemberId={selectedMemberId} />
          {selectedMemberId && (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          )}
        </div>
      )}

      {canManage && !selectedMemberId ? (
        <EmptyState
          icon={TrendingUp}
          title="Select a member"
          description="Choose a member above to view or record their progress."
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No progress records yet"
          description={canManage ? "Add the first progress record for this member." : "No progress has been recorded yet."}
        />
      ) : (
        <>
          <ChartCard title="Weight over time" description="Tracked from progress records.">
            <ProgressChart data={chartData} />
          </ChartCard>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">History</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Body Fat %</TableHead>
                  <TableHead>Height</TableHead>
                  <TableHead>Chest</TableHead>
                  <TableHead>Waist</TableHead>
                  <TableHead>Arms</TableHead>
                  <TableHead>Thighs</TableHead>
                  <TableHead>Notes</TableHead>
                  {canManage && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.recordDate)}</TableCell>
                    <TableCell>{record.weight ?? "—"}</TableCell>
                    <TableCell>{record.bodyFatPercent ?? "—"}</TableCell>
                    <TableCell>{record.height ?? "—"}</TableCell>
                    <TableCell>{record.chest ?? "—"}</TableCell>
                    <TableCell>{record.waist ?? "—"}</TableCell>
                    <TableCell>{record.arms ?? "—"}</TableCell>
                    <TableCell>{record.thighs ?? "—"}</TableCell>
                    <TableCell className="max-w-[16rem] truncate">{record.notes ?? "—"}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(record)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={(open) => (
                              <Button variant="ghost" size="icon" onClick={open}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            title="Delete progress record?"
                            description={`The record from ${formatDate(record.recordDate)} will be permanently deleted.`}
                            onConfirm={() => handleDelete(record.id)}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {photos.map((record) => (
                  <div key={record.id} className="space-y-1.5">
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
                      <Image
                        src={record.photoUrl as string}
                        alt={`Progress photo from ${formatDate(record.recordDate)}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-center text-xs text-muted-foreground">{formatDate(record.recordDate)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {canManage && selectedMemberId && (
        <RecordDialog
          key={`record-${editingRecord?.id ?? "new"}-${recordNonce}`}
          ref={dialogRef}
          memberId={selectedMemberId}
          record={editingRecord}
        />
      )}
    </div>
  );
}

function MemberPicker({ members, selectedMemberId }: { members: Option[]; selectedMemberId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("memberId", next);
    else params.delete("memberId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-64">
      <Combobox
        value={selectedMemberId ?? ""}
        onChange={handleChange}
        placeholder="Search member…"
        options={members.map((m) => ({ value: m.id, label: m.name }))}
      />
    </div>
  );
}

function RecordDialog({
  ref,
  memberId,
  record,
}: {
  ref: React.RefObject<DialogHandle | null>;
  memberId: string;
  record: RecordRow | null;
}) {
  const action = record ? updateProgressRecordAction : createProgressRecordAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) ref.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog ref={ref} title={record ? "Edit progress record" : "Add progress record"}>
      <form action={formAction} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="memberId" value={memberId} />
        {record && <input type="hidden" name="id" value={record.id} />}
        <Field label="Record date" htmlFor="recordDate" required error={state.fieldErrors?.recordDate}>
          <Input
            id="recordDate"
            name="recordDate"
            type="date"
            defaultValue={(record?.recordDate ?? new Date().toISOString()).slice(0, 10)}
            invalid={!!state.fieldErrors?.recordDate}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Weight (kg)" htmlFor="weight" error={state.fieldErrors?.weight}>
            <Input id="weight" name="weight" type="number" min={0} step="any" defaultValue={record?.weight ?? ""} />
          </Field>
          <Field label="Body fat %" htmlFor="bodyFatPercent" error={state.fieldErrors?.bodyFatPercent}>
            <Input
              id="bodyFatPercent"
              name="bodyFatPercent"
              type="number"
              min={0}
              step="any"
              defaultValue={record?.bodyFatPercent ?? ""}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Height (cm)" htmlFor="height" error={state.fieldErrors?.height}>
            <Input id="height" name="height" type="number" min={0} step="any" defaultValue={record?.height ?? ""} />
          </Field>
          <Field label="Chest (cm)" htmlFor="chest" error={state.fieldErrors?.chest}>
            <Input id="chest" name="chest" type="number" min={0} step="any" defaultValue={record?.chest ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Waist (cm)" htmlFor="waist" error={state.fieldErrors?.waist}>
            <Input id="waist" name="waist" type="number" min={0} step="any" defaultValue={record?.waist ?? ""} />
          </Field>
          <Field label="Arms (cm)" htmlFor="arms" error={state.fieldErrors?.arms}>
            <Input id="arms" name="arms" type="number" min={0} step="any" defaultValue={record?.arms ?? ""} />
          </Field>
          <Field label="Thighs (cm)" htmlFor="thighs" error={state.fieldErrors?.thighs}>
            <Input id="thighs" name="thighs" type="number" min={0} step="any" defaultValue={record?.thighs ?? ""} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="notes" error={state.fieldErrors?.notes}>
          <Textarea id="notes" name="notes" defaultValue={record?.notes ?? ""} rows={2} />
        </Field>
        <Field
          label="Photo"
          htmlFor="photo"
          hint={record?.photoUrl ? "Uploading a new photo replaces the current one." : "JPEG, PNG or WEBP, up to 5MB."}
        >
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
          />
        </Field>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {record ? "Save changes" : "Add record"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
