import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type Option = { id: string; label: string };

export type MemberFormDefaults = {
  name?: string;
  username?: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string;
  gender?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  branchId?: string | null;
  trainerId?: string | null;
};

export function MemberFormFields({
  defaultValues,
  fieldErrors,
  branches,
  trainers,
}: {
  defaultValues?: MemberFormDefaults;
  fieldErrors?: Record<string, string[] | undefined>;
  branches: Option[];
  trainers: Option[];
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
        <Field label="Date of birth" htmlFor="dateOfBirth" error={fieldErrors?.dateOfBirth}>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={defaultValues?.dateOfBirth ?? ""}
            invalid={!!fieldErrors?.dateOfBirth}
          />
        </Field>
        <Field label="Gender" htmlFor="gender" error={fieldErrors?.gender}>
          <Select
            id="gender"
            name="gender"
            defaultValue={defaultValues?.gender ?? ""}
            invalid={!!fieldErrors?.gender}
          >
            <option value="">Not specified</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
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
        <Field label="Trainer" htmlFor="trainerId" error={fieldErrors?.trainerId}>
          <Select
            id="trainerId"
            name="trainerId"
            defaultValue={defaultValues?.trainerId ?? ""}
            invalid={!!fieldErrors?.trainerId}
          >
            <option value="">Unassigned</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Address" htmlFor="address" error={fieldErrors?.address}>
        <Textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={defaultValues?.address ?? ""}
          invalid={!!fieldErrors?.address}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Emergency contact name"
          htmlFor="emergencyContactName"
          error={fieldErrors?.emergencyContactName}
        >
          <Input
            id="emergencyContactName"
            name="emergencyContactName"
            defaultValue={defaultValues?.emergencyContactName ?? ""}
            invalid={!!fieldErrors?.emergencyContactName}
          />
        </Field>
        <Field
          label="Emergency contact phone"
          htmlFor="emergencyContactPhone"
          error={fieldErrors?.emergencyContactPhone}
        >
          <Input
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            defaultValue={defaultValues?.emergencyContactPhone ?? ""}
            invalid={!!fieldErrors?.emergencyContactPhone}
          />
        </Field>
      </div>
    </div>
  );
}
