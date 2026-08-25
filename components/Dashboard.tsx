"use client";

import { useState, useTransition } from "react";
import { advanceTask } from "@/app/actions";
import type { MonthGrid } from "@/lib/calendar";
import type { FilterKey, ScreenKey } from "@/lib/labels";
import type { Viewer } from "@/lib/permissions";
import type { MovementView, ProjectView } from "@/lib/view";
import NavBar from "./NavBar";
import StatsStrip from "./StatsStrip";
import BoardScreen from "./screens/BoardScreen";
import CalendarScreen from "./screens/CalendarScreen";
import ProjectsScreen from "./screens/ProjectsScreen";
import { RoleProvider, type CurrentUser } from "./RoleContext";

/**
 * Everything on this page is one screen's worth of state (which tab, which row
 * is selected) plus server actions for the writes. The project data itself is
 * owned by the server component above and arrives as props.
 */
export default function Dashboard({
  viewer,
  canCreate,
  projects,
  movements,
  grid,
  today,
}: {
  viewer: Viewer & { name: string; email: string };
  canCreate: boolean;
  projects: ProjectView[];
  movements: MovementView[];
  grid: MonthGrid;
  today: string;
}) {
  const [screen, setScreen] = useState<ScreenKey>("calendar");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(today);

  const [pending, startTransition] = useTransition();

  const selected =
    projects.find((p) => p.id === selectedId) ?? projects[0] ?? null;

  const runAdvance = (taskId: string) =>
    startTransition(() => {
      void advanceTask(taskId);
    });

  // The current user object for the role context — viewer comes from the real session.
  const currentUser: CurrentUser = {
    id: viewer.id,
    name: viewer.name,
    role: viewer.role,
  };

  return (
    <RoleProvider viewer={currentUser}>
      <div className={pending ? "cursor-progress" : undefined}>
        <NavBar viewer={viewer} canCreate={canCreate} />

        <StatsStrip
          projects={projects}
          screen={screen}
          onScreenChange={setScreen}
        />

        {projects.length === 0 ? (
          <div className="shell pt-16 text-center">
            <p className="text-[15px] text-ink/55">
              لا توجد مشاريع بعد. اضغط «مشروع جديد» للبدء.
            </p>
          </div>
        ) : (
          <>
            {screen === "projects" && (
              <ProjectsScreen
                projects={projects}
                filter={filter}
                onFilterChange={setFilter}
                selected={selected}
                onSelect={setSelectedId}
              />
            )}

            {screen === "board" && (
              <BoardScreen projects={projects} onAdvanceTask={runAdvance} />
            )}

            {screen === "calendar" && (
              <CalendarScreen
                grid={grid}
                today={today}
                movements={movements}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            )}
          </>
        )}
      </div>
    </RoleProvider>
  );
}
