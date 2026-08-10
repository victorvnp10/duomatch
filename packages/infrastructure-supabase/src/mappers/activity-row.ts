import type { Activity, ActivitySelection } from "@duomatch/domain";

// Shape of a row returned by `.from("activities").select("...activity_selections(...)")`
// — PostgREST nests the related activity_selections rows as an array under
// the relation name, which is mapped here to domain's
// Activity.selections: Record<userId, ActivitySelection>.
export interface ActivityRow {
  type: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
  activity_selections: Array<{
    user_id: string;
    status: string;
    selection_date: string | null;
  }>;
}

// exactOptionalPropertyTypes forbids assigning `undefined` to an optional
// property directly — the key must be omitted instead.
const mapSelection = (row: ActivityRow["activity_selections"][number]): ActivitySelection =>
  row.selection_date != null
    ? { status: row.status, date: row.selection_date }
    : { status: row.status };

export const mapActivityRow = (row: ActivityRow): Activity => ({
  ...(row.type != null ? { type: row.type } : {}),
  ...(row.category != null ? { category: row.category } : {}),
  ...(row.created_by != null ? { createdBy: row.created_by } : {}),
  createdAt: row.created_at,
  selections: Object.fromEntries(
    row.activity_selections.map((selection) => [selection.user_id, mapSelection(selection)]),
  ),
});
