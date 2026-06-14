//! Quick Create IPC 与 usecase DTO 互转。

use stoneflow_ipc_protocol::{
    QuickCreatePayload, QuickCreatedPayload, QuickInitialStatePayload,
    QuickListProjectsBySpacePayload, QuickPlacementKind, QuickPlacementPayload,
    QuickProjectItemPayload, QuickProjectOptionKind, QuickProjectOptionPayload,
    QuickProjectsBySpaceResponsePayload, QuickScopeKind, QuickScopePayload,
    QuickSearchPayload, QuickSearchResponsePayload, QuickSpaceSummaryPayload,
    QuickTaskItemPayload,
};
use stoneflow_usecase::quick_create::{
    QuickCreateInput, QuickCreatedDto, QuickListProjectsBySpaceInput, QuickPlacementDto,
    QuickPlacementKind as UsecasePlacementKind, QuickProjectItemDto, QuickProjectOptionDto,
    QuickProjectOptionKind as UsecaseProjectOptionKind, QuickProjectsBySpaceDto,
    QuickScopeDto, QuickScopeKind as UsecaseScopeKind, QuickSearchInput, QuickSearchResultDto,
    QuickSpaceSummaryDto, QuickTaskItemDto,
};
use stoneflow_usecase::quick_create_context::QuickInitialStateDto;

pub fn map_list_projects_input(
    input: QuickListProjectsBySpacePayload,
) -> QuickListProjectsBySpaceInput {
    QuickListProjectsBySpaceInput {
        space_id: input.space_id,
    }
}

pub fn map_projects_by_space_output(
    output: QuickProjectsBySpaceDto,
) -> QuickProjectsBySpaceResponsePayload {
    QuickProjectsBySpaceResponsePayload {
        space_id: output.space_id,
        inbox_project: map_project_option(output.inbox_project),
        no_project_option: map_project_option(output.no_project_option),
        projects: output.projects.into_iter().map(map_project_option).collect(),
    }
}

pub fn map_search_input(input: QuickSearchPayload) -> QuickSearchInput {
    QuickSearchInput {
        query: input.query,
        limit: input.limit,
    }
}

pub fn map_search_output(output: QuickSearchResultDto) -> QuickSearchResponsePayload {
    QuickSearchResponsePayload {
        tasks: output.tasks.into_iter().map(map_task_item).collect(),
        projects: output.projects.into_iter().map(map_project_item).collect(),
    }
}

pub fn map_create_input(input: QuickCreatePayload) -> QuickCreateInput {
    QuickCreateInput {
        space_id: input.space_id,
        placement: map_placement_input(input.placement),
        title: input.title,
        note: input.note,
        status: input.status,
        priority: input.priority,
        due_at: input.due_at,
        scheduled_at: input.scheduled_at,
        reminder_at: input.reminder_at,
    }
}

pub fn map_created_output(output: QuickCreatedDto) -> QuickCreatedPayload {
    QuickCreatedPayload {
        id: output.id,
        title: output.title,
        space_id: output.space_id,
        project_id: output.project_id,
        inbox_at: output.inbox_at,
        space_fallback: output.space_fallback,
    }
}

pub fn map_initial_state_output(output: QuickInitialStateDto) -> QuickInitialStatePayload {
    QuickInitialStatePayload {
        current_scope: map_scope_output(output.current_scope),
        default_space_id: output.default_space_id,
        default_placement: map_placement_output(output.default_placement),
        spaces: output.spaces.into_iter().map(map_space_summary).collect(),
        projects: output.projects.into_iter().map(map_project_option).collect(),
        recent_tasks: output.recent_tasks.into_iter().map(map_task_item).collect(),
        recent_projects: output
            .recent_projects
            .into_iter()
            .map(map_project_item)
            .collect(),
    }
}

fn map_placement_input(input: QuickPlacementPayload) -> QuickPlacementDto {
    QuickPlacementDto {
        kind: match input.kind {
            QuickPlacementKind::Inbox => UsecasePlacementKind::Inbox,
            QuickPlacementKind::NoProject => UsecasePlacementKind::NoProject,
            QuickPlacementKind::Project => UsecasePlacementKind::Project,
        },
        project_id: input.project_id,
    }
}

fn map_placement_output(input: QuickPlacementDto) -> QuickPlacementPayload {
    QuickPlacementPayload {
        kind: match input.kind {
            UsecasePlacementKind::Inbox => QuickPlacementKind::Inbox,
            UsecasePlacementKind::NoProject => QuickPlacementKind::NoProject,
            UsecasePlacementKind::Project => QuickPlacementKind::Project,
        },
        project_id: input.project_id,
    }
}

fn map_scope_output(input: QuickScopeDto) -> QuickScopePayload {
    QuickScopePayload {
        kind: match input.kind {
            UsecaseScopeKind::All => QuickScopeKind::All,
            UsecaseScopeKind::Space => QuickScopeKind::Space,
        },
        space_id: input.space_id,
    }
}

fn map_space_summary(input: QuickSpaceSummaryDto) -> QuickSpaceSummaryPayload {
    QuickSpaceSummaryPayload {
        id: input.id,
        name: input.name,
        icon_key: input.icon_key,
        color_key: input.color_key,
        is_default: input.is_default,
    }
}

fn map_project_option(input: QuickProjectOptionDto) -> QuickProjectOptionPayload {
    QuickProjectOptionPayload {
        kind: match input.kind {
            UsecaseProjectOptionKind::Inbox => QuickProjectOptionKind::Inbox,
            UsecaseProjectOptionKind::NoProject => QuickProjectOptionKind::NoProject,
            UsecaseProjectOptionKind::Project => QuickProjectOptionKind::Project,
        },
        id: input.id,
        space_id: input.space_id,
        name: input.name,
    }
}

fn map_task_item(input: QuickTaskItemDto) -> QuickTaskItemPayload {
    QuickTaskItemPayload {
        id: input.id,
        space_id: input.space_id,
        space_name: input.space_name,
        project_id: input.project_id,
        project_name: input.project_name,
        inbox_at: input.inbox_at,
        title: input.title,
        note: input.note,
        priority: input.priority,
        status: input.status,
        updated_at: input.updated_at,
        completed_at: input.completed_at,
    }
}

fn map_project_item(input: QuickProjectItemDto) -> QuickProjectItemPayload {
    QuickProjectItemPayload {
        id: input.id,
        space_id: input.space_id,
        space_name: input.space_name,
        name: input.name,
        note: input.note,
        updated_at: input.updated_at,
        completed_at: input.completed_at,
    }
}
