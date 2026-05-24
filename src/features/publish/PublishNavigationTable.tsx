import { Folder, GripVertical } from "lucide-react";
import { useState } from "react";
import type { DragEvent } from "react";
import type {
  PublishNavigationGroupRecord,
  PublishNavigationItemRecord
} from "../../api/types";

type DragSource = {
  groupIndex: number;
  itemIndex: number;
};

type DropTarget = {
  groupIndex: number;
  insertIndex: number;
  itemIndex?: number;
  position: "before" | "after" | "empty";
};

type PublishNavigationTableProps = {
  groups: PublishNavigationGroupRecord[];
  onChange: (groups: PublishNavigationGroupRecord[]) => void;
};

function moveNavigationItem(
  groups: PublishNavigationGroupRecord[],
  source: DragSource,
  target: DropTarget
) {
  const nextGroups = groups.map((group) => ({
    ...group,
    items: [...group.items]
  }));
  const [item] = nextGroups[source.groupIndex]?.items.splice(source.itemIndex, 1) ?? [];
  if (!item) {
    return groups;
  }

  let insertIndex = target.insertIndex;
  if (source.groupIndex === target.groupIndex && source.itemIndex < target.insertIndex) {
    insertIndex -= 1;
  }
  nextGroups[target.groupIndex].items.splice(Math.max(0, insertIndex), 0, item);
  return nextGroups;
}

function navigationRowsEqual(
  first: PublishNavigationGroupRecord[],
  second: PublishNavigationGroupRecord[]
) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function itemDropClass(
  dropTarget: DropTarget | null,
  groupIndex: number,
  itemIndex: number
) {
  if (
    dropTarget?.groupIndex !== groupIndex
    || dropTarget.itemIndex !== itemIndex
    || dropTarget.position === "empty"
  ) {
    return "";
  }
  return ` drop-${dropTarget.position}`;
}

function emptyDropClass(dropTarget: DropTarget | null, groupIndex: number) {
  return dropTarget?.groupIndex === groupIndex && dropTarget.position === "empty"
    ? " drop-empty"
    : "";
}

export function PublishNavigationTable({ groups, onChange }: PublishNavigationTableProps) {
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const resetDragState = () => {
    setDragSource(null);
    setDropTarget(null);
  };

  const updateDropTarget = (
    event: DragEvent<HTMLElement>,
    groupIndex: number,
    itemIndex: number
  ) => {
    if (!dragSource) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY > bounds.top + bounds.height / 2;
    setDropTarget({
      groupIndex,
      itemIndex,
      insertIndex: itemIndex + (isAfter ? 1 : 0),
      position: isAfter ? "after" : "before"
    });
  };

  const updateEmptyDropTarget = (event: DragEvent<HTMLElement>, groupIndex: number) => {
    if (!dragSource) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({
      groupIndex,
      insertIndex: 0,
      position: "empty"
    });
  };

  const handleDrop = (event: DragEvent<HTMLElement>, target: DropTarget) => {
    event.preventDefault();
    if (!dragSource) {
      resetDragState();
      return;
    }
    const nextGroups = moveNavigationItem(groups, dragSource, target);
    resetDragState();
    if (!navigationRowsEqual(groups, nextGroups)) {
      onChange(nextGroups);
    }
  };

  return (
    <section className="publish-navigation-table">
      <header>
        <div>
          <h2>Navigation</h2>
          <p>These are the navigation items the site will display on the left hand sidebar.</p>
        </div>
        <span>Drag &amp; drop</span>
      </header>

      <div className="publish-navigation-list">
        {groups.map((group, groupIndex) => (
          <div className="publish-navigation-group" key={`${group.title}-${groupIndex}`}>
            <div className="publish-navigation-folder">
              <Folder size={18} />
              <span>{group.title}</span>
            </div>

            {group.items.length > 0 ? (
              group.items.map((item: PublishNavigationItemRecord, itemIndex: number) => {
                const isDragging = (
                  dragSource?.groupIndex === groupIndex
                  && dragSource.itemIndex === itemIndex
                );
                return (
                  <div
                    className={[
                      "publish-navigation-row",
                      itemDropClass(dropTarget, groupIndex, itemIndex),
                      isDragging ? "dragging" : ""
                    ].filter(Boolean).join(" ")}
                    draggable
                    key={item.path}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.path);
                      setDragSource({ groupIndex, itemIndex });
                    }}
                    onDragOver={(event) => updateDropTarget(event, groupIndex, itemIndex)}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                      setDropTarget((current) => (
                        current?.groupIndex === groupIndex && current.itemIndex === itemIndex
                          ? null
                          : current
                      ));
                    }}
                    onDrop={(event) => {
                      const target = dropTarget ?? {
                        groupIndex,
                        itemIndex,
                        insertIndex: itemIndex,
                        position: "before" as const
                      };
                      handleDrop(event, target);
                    }}
                    onDragEnd={resetDragState}
                  >
                    <GripVertical size={16} />
                    <span>{item.title}</span>
                    <code>{item.path}</code>
                  </div>
                );
              })
            ) : (
              <div
                className={`publish-navigation-empty${emptyDropClass(dropTarget, groupIndex)}`}
                onDragOver={(event) => updateEmptyDropTarget(event, groupIndex)}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setDropTarget((current) => (
                    current?.groupIndex === groupIndex && current.position === "empty"
                      ? null
                      : current
                  ));
                }}
                onDrop={(event) => handleDrop(event, {
                  groupIndex,
                  insertIndex: 0,
                  position: "empty"
                })}
              >
                No notes in this section.
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
