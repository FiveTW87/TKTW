// Display info for the four identity roles — the seal glyph (中文, kept for the
// stylistic corner seal), a readable Thai name, and the CSS class that colours
// it. Shared by the character card, PlayerTile (seal + death overlay), and the
// role-reveal modal so the Thai naming stays consistent everywhere.
export interface RoleDisplay {
  cn: string;
  name: string;
  cls: string;
}

const ROLES: Record<string, RoleDisplay> = {
  lord: { cn: "主", name: "เจ้าเมือง", cls: "seal-lord" },
  loyalist: { cn: "忠", name: "ขุนนางภักดี", cls: "seal-loyalist" },
  rebel: { cn: "反", name: "กบฏ", cls: "seal-rebel" },
  traitor: { cn: "內", name: "ไส้ศึก", cls: "seal-traitor" },
};

export function roleDisplay(role: string | undefined): RoleDisplay | undefined {
  return role ? ROLES[role] : undefined;
}
