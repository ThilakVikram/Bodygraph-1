import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type Option = { id: string; label: string };

export type TrainerFormDefaults = {
  name?: string;
  username?: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  branchId?: string | null;
};

export function TrainerFormFields({
  defaultValues,
  fieldErrors,
  branches,
}: {
  defaultValues?: TrainerFormDefaults;
  fieldErrors?: Record<string, string[] | undefined>;
  branches: Option[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required error={fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            invalid={!!fieldErrors?.name}
          />
        </Field>
        <Field
          label="Username"
          htmlFor="username"
          required
          hint="Lowercase letters, numbers, dots, underscores and hyphens."
          error={fieldErrors?.username}
        >
          <Input
            id="username"
            name="username"
            defaultValue={defaultValues?.username}
            invalid={!!fieldErrors?.username}
          />
        </Field>
        <Field label="Phone" htmlFor="phone" required error={fieldErrors?.phone}>
          <Input
            id="phone"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            invalid={!!fieldErrors?.phone}
          />
        </Field>
        <Field label="Email" htmlFor="email" hint="Optional" error={fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            invalid={!!fieldErrors?.email}
          />
        </Field>
        <Field label="Specialization" htmlFor="specialization" error={fieldErrors?.specialization}>
          <Input
            id="specialization"
            name="specialization"
            placeholder="e.g. Strength & Conditioning"
            defaultValue={defaultValues?.specialization ?? ""}
            invalid={!!fieldErrors?.specialization}
          />
        </Field>
        <Field label="Experience (years)" htmlFor="experienceYears" error={fieldErrors?.experienceYears}>
          <Input
            id="experienceYears"
            name="experienceYears"
            type="number"
            min={0}
            max={80}
            defaultValue={defaultValues?.experienceYears ?? ""}
            invalid={!!fieldErrors?.experienceYears}
          />
        </Field>
        <Field label="Branch" htmlFor="branchId" error={fieldErrors?.branchId}>
          <Select
            id="branchId"
            name="branchId"
            defaultValue={defaultValues?.branchId ?? ""}
            invalid={!!fieldErrors?.branchId}
          >
            <option value="">No branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Bio" htmlFor="bio" error={fieldErrors?.bio}>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={defaultValues?.bio ?? ""}
          invalid={!!fieldErrors?.bio}
        />
      </Field>
    </div>
  );
}
