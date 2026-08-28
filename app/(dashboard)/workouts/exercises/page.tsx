import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { parsePagination, getParam, type SearchParams } from "@/lib/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseLibrary } from "./exercise-library";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN", "TRAINER");
  const sp = await searchParams;
  const search = getParam(sp, "search") ?? "";
  const { page, take, skip } = parsePagination(sp);

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { category: { contains: search } },
          { muscleGroup: { contains: search } },
        ],
      }
    : {};

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
      include: { _count: { select: { workoutExercises: true } } },
    }),
    prisma.exercise.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Exercise Library"
        description="Shared exercises any trainer can add to a member's workout plan."
      />
      <ExerciseLibrary
        exercises={exercises.map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          muscleGroup: e.muscleGroup,
          description: e.description,
          instructions: e.instructions,
          mediaUrl: e.mediaUrl,
          usageCount: e._count.workoutExercises,
        }))}
        searchParams={sp}
        page={page}
        pageSize={take}
        total={total}
      />
    </div>
  );
}
