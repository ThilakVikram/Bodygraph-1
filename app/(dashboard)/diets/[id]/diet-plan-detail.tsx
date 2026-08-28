"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  updateDietPlanAction,
  deleteDietPlanAction,
  addDietItemAction,
  updateDietItemAction,
  removeDietItemAction,
} from "@/lib/actions/diets";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WORKOUT_STATUSES, MEAL_TYPES } from "@/lib/constants";
import { formatDate, titleCase } from "@/lib/utils";

type PlanDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  memberName: string;
  trainerName: string;
};

type DietItemEntry = {
  id: string;
  mealType: string;
  foodName: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  timing: string | null;
  instructions: string | null;
  order: number;
};

export function DietPlanDetail({
  plan,
  items,
  canEdit,
}: {
  plan: PlanDetail;
  items: DietItemEntry[];
  canEdit: boolean;
}) {
  const editPlanRef = useRef<DialogHandle>(null);
  const itemDialogRef = useRef<DialogHandle>(null);
  const [editingItem, setEditingItem] = useState<DietItemEntry | null>(null);
  // Bumped on every dialog open to force a fresh mount, so a previous submission's
  // field values / success state never leak into the next add/edit.
  const [planNonce, setPlanNonce] = useState(0);
  const [itemNonce, setItemNonce] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  function openEditPlan() {
    setPlanNonce((n) => n + 1);
    editPlanRef.current?.open();
  }

  function openAddItem() {
    setEditingItem(null);
    setItemNonce((n) => n + 1);
    itemDialogRef.current?.open();
  }

  function openEditItem(item: DietItemEntry) {
    setEditingItem(item);
    setItemNonce((n) => n + 1);
    itemDialogRef.current?.open();
  }

  async function handleDeletePlan() {
    const fd = new FormData();
    fd.set("id", plan.id);
    const result = await deleteDietPlanAction(initialActionState, fd);
    if (result?.error) {
      toast({ title: "Couldn't delete plan", description: result.error, variant: "error" });
    }
  }

  async function handleRemoveItem(itemId: string) {
    const fd = new FormData();
    fd.set("id", itemId);
    fd.set("dietPlanId", plan.id);
    const result = await removeDietItemAction(initialActionState, fd);
    if (result.error) {
      toast({ title: "Couldn't remove item", description: result.error, variant: "error" });
    } else {
      router.refresh();
    }
  }

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const byMeal = new Map<string, DietItemEntry[]>();
  for (const item of items) {
    const list = byMeal.get(item.mealType) ?? [];
    list.push(item);
    byMeal.set(item.mealType, list);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Plan details</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.memberName} · Trainer {plan.trainerName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={plan.status} />
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={openEditPlan}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <ConfirmDialog
                    trigger={(open) => (
                      <Button variant="destructive" size="sm" onClick={open}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                    title="Delete diet plan?"
                    description={`"${plan.name}" and all of its food items will be permanently deleted.`}
                    onConfirm={handleDeletePlan}
                  />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start date</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(plan.startDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End date</p>
            <p className="mt-1 text-sm text-foreground">{plan.endDate ? formatDate(plan.endDate) : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
            <p className="mt-1 text-sm text-foreground">{plan.description ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily nutrition summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NutritionStat label="Calories" value={totals.calories} unit="kcal" />
            <NutritionStat label="Protein" value={totals.protein} unit="g" />
            <NutritionStat label="Carbs" value={totals.carbs} unit="g" />
            <NutritionStat label="Fat" value={totals.fat} unit="g" />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Meals</h2>
        {canEdit && (
          <Button size="sm" onClick={openAddItem}>
            <Plus className="h-4 w-4" />
            Add food item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No food items yet"
          description={canEdit ? "Add food items to build out this plan's meals." : "This plan has no food items yet."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {MEAL_TYPES.map((mealType) => {
            const entries = (byMeal.get(mealType) ?? []).sort((a, b) => a.order - b.order);
            if (entries.length === 0) return null;
            return (
              <Card key={mealType}>
                <CardHeader>
                  <CardTitle>{titleCase(mealType)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {entries.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {item.foodName}
                          {item.quantity ? ` · ${item.quantity}` : ""}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {[
                            item.calories ? `${item.calories} kcal` : null,
                            item.protein ? `${item.protein}g protein` : null,
                            item.carbs ? `${item.carbs}g carbs` : null,
                            item.fat ? `${item.fat}g fat` : null,
                            item.timing,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No nutrition details"}
                        </p>
                        {item.instructions && (
                          <p className="mt-1 text-xs text-muted-foreground">{item.instructions}</p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={(open) => (
                              <Button variant="ghost" size="icon" onClick={open}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            title="Remove food item?"
                            description={`"${item.foodName}" will be removed from ${titleCase(mealType)}.`}
                            onConfirm={() => handleRemoveItem(item.id)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canEdit && (
        <>
          <EditPlanDialog key={`plan-${planNonce}`} ref={editPlanRef} plan={plan} />
          <DietItemDialog
            key={`item-${editingItem?.id ?? "new"}-${itemNonce}`}
            ref={itemDialogRef}
            dietPlanId={plan.id}
            item={editingItem}
          />
        </>
      )}
    </div>
  );
}

function NutritionStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {Math.round(value * 10) / 10} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function EditPlanDialog({ ref, plan }: { ref: React.RefObject<DialogHandle | null>; plan: PlanDetail }) {
  const [state, formAction, pending] = useActionState(updateDietPlanAction, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) ref.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog ref={ref} title="Edit plan details">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={plan.id} />
        <Field label="Plan name" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={plan.name} invalid={!!state.fieldErrors?.name} />
        </Field>
        <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
          <Textarea id="description" name="description" defaultValue={plan.description ?? ""} rows={2} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Start date" htmlFor="startDate" required error={state.fieldErrors?.startDate}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={plan.startDate.slice(0, 10)}
              invalid={!!state.fieldErrors?.startDate}
            />
          </Field>
          <Field label="End date" htmlFor="endDate" error={state.fieldErrors?.endDate}>
            <Input id="endDate" name="endDate" type="date" defaultValue={plan.endDate ? plan.endDate.slice(0, 10) : ""} />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={plan.status}>
              {WORKOUT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DietItemDialog({
  ref,
  dietPlanId,
  item,
}: {
  ref: React.RefObject<DialogHandle | null>;
  dietPlanId: string;
  item: DietItemEntry | null;
}) {
  const action = item ? updateDietItemAction : addDietItemAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) ref.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog ref={ref} title={item ? "Edit food item" : "Add food item"}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="dietPlanId" value={dietPlanId} />
        {item && <input type="hidden" name="id" value={item.id} />}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meal" htmlFor="mealType" required error={state.fieldErrors?.mealType}>
            <Select id="mealType" name="mealType" defaultValue={item?.mealType ?? MEAL_TYPES[0]}>
              {MEAL_TYPES.map((meal) => (
                <option key={meal} value={meal}>
                  {titleCase(meal)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Food name" htmlFor="foodName" required error={state.fieldErrors?.foodName}>
            <Input id="foodName" name="foodName" defaultValue={item?.foodName} invalid={!!state.fieldErrors?.foodName} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity" htmlFor="quantity" hint='e.g. "200g"' error={state.fieldErrors?.quantity}>
            <Input id="quantity" name="quantity" defaultValue={item?.quantity ?? ""} />
          </Field>
          <Field label="Timing" htmlFor="timing" hint='e.g. "8:00 AM"' error={state.fieldErrors?.timing}>
            <Input id="timing" name="timing" defaultValue={item?.timing ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Calories" htmlFor="calories" error={state.fieldErrors?.calories}>
            <Input id="calories" name="calories" type="number" min={0} step="any" defaultValue={item?.calories ?? ""} />
          </Field>
          <Field label="Protein (g)" htmlFor="protein" error={state.fieldErrors?.protein}>
            <Input id="protein" name="protein" type="number" min={0} step="any" defaultValue={item?.protein ?? ""} />
          </Field>
          <Field label="Carbs (g)" htmlFor="carbs" error={state.fieldErrors?.carbs}>
            <Input id="carbs" name="carbs" type="number" min={0} step="any" defaultValue={item?.carbs ?? ""} />
          </Field>
          <Field label="Fat (g)" htmlFor="fat" error={state.fieldErrors?.fat}>
            <Input id="fat" name="fat" type="number" min={0} step="any" defaultValue={item?.fat ?? ""} />
          </Field>
        </div>
        <Field label="Instructions" htmlFor="instructions" error={state.fieldErrors?.instructions}>
          <Textarea id="instructions" name="instructions" defaultValue={item?.instructions ?? ""} rows={2} />
        </Field>
        <Field label="Order" htmlFor="order" error={state.fieldErrors?.order}>
          <Input id="order" name="order" type="number" min={0} defaultValue={item?.order ?? 0} className="max-w-[8rem]" />
        </Field>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {item ? "Save changes" : "Add item"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
