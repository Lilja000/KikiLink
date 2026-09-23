/** Contract for the existing New chat dialog, shared by all entry points. */
export interface PeoplePickerRequest {
  mode: "Create group" | "Add members" | "Add friend";
  exclude?: readonly number[];
  minimum?: number;
  maximum: number;
  groupTitle?: string;
  eligible?(member: number): boolean;
  confirm(members: number[], title?: string): Promise<void>;
}
