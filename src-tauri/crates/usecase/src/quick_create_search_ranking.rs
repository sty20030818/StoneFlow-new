//! Quick Create 搜索排序：相似度主导，辅以可行动性、Space 上下文、优先级与时间。

use std::cmp::Ordering;

use crate::quick_create::{QuickProjectItemDto, QuickTaskItemDto};

/// 每个生命周期桶先取回的候选上限，合并后再统一排序裁切。
pub const QUICK_CREATE_SEARCH_POOL_LIMIT: u64 = 15;

/// Quick Create 搜索排序可用的 Space 上下文。
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct QuickSearchScopeContext {
    pub current_space_id: Option<String>,
    pub default_space_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum TextSimilarityRank {
    ExactMatch,
    PrefixMatch,
    TokenContains,
    SubstringContains,
    NoteContains,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum QuickTaskActionabilityRank {
    Doing,
    Todo,
    Waiting,
    Done,
    Canceled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum QuickProjectLifecycleRank {
    Active,
    Completed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum SpaceContextRank {
    Current,
    Default,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct TextMatchMeta {
    rank: TextSimilarityRank,
    primary_char_len: usize,
    hit_char_index: usize,
}

pub fn rank_quick_create_tasks(
    tasks: &mut [QuickTaskItemDto],
    query: &str,
    scope: &QuickSearchScopeContext,
) {
    tasks.sort_by(|left, right| compare_quick_create_task(left, right, query, scope));
}

pub fn rank_quick_create_projects(
    projects: &mut [QuickProjectItemDto],
    query: &str,
    scope: &QuickSearchScopeContext,
) {
    projects.sort_by(|left, right| compare_quick_create_project(left, right, query, scope));
}

fn compare_quick_create_task(
    left: &QuickTaskItemDto,
    right: &QuickTaskItemDto,
    query: &str,
    scope: &QuickSearchScopeContext,
) -> Ordering {
    let left_match = classify_text_match(&left.title, left.note.as_deref(), query);
    let right_match = classify_text_match(&right.title, right.note.as_deref(), query);

    left_match
        .rank
        .cmp(&right_match.rank)
        .then_with(|| {
            left_match
                .primary_char_len
                .cmp(&right_match.primary_char_len)
        })
        .then_with(|| left_match.hit_char_index.cmp(&right_match.hit_char_index))
        .then_with(|| {
            task_actionability_rank(&left.status).cmp(&task_actionability_rank(&right.status))
        })
        .then_with(|| {
            space_context_rank(&left.space_id, scope)
                .cmp(&space_context_rank(&right.space_id, scope))
        })
        .then_with(|| right.priority.cmp(&left.priority))
        .then_with(|| right.updated_at.cmp(&left.updated_at))
        .then_with(|| left.id.cmp(&right.id))
}

fn compare_quick_create_project(
    left: &QuickProjectItemDto,
    right: &QuickProjectItemDto,
    query: &str,
    scope: &QuickSearchScopeContext,
) -> Ordering {
    let left_match = classify_text_match(&left.name, left.note.as_deref(), query);
    let right_match = classify_text_match(&right.name, right.note.as_deref(), query);

    left_match
        .rank
        .cmp(&right_match.rank)
        .then_with(|| {
            left_match
                .primary_char_len
                .cmp(&right_match.primary_char_len)
        })
        .then_with(|| left_match.hit_char_index.cmp(&right_match.hit_char_index))
        .then_with(|| {
            project_lifecycle_rank(left.completed_at.as_ref())
                .cmp(&project_lifecycle_rank(right.completed_at.as_ref()))
        })
        .then_with(|| {
            space_context_rank(&left.space_id, scope)
                .cmp(&space_context_rank(&right.space_id, scope))
        })
        .then_with(|| right.updated_at.cmp(&left.updated_at))
        .then_with(|| left.id.cmp(&right.id))
}

fn classify_text_match(primary: &str, secondary: Option<&str>, query: &str) -> TextMatchMeta {
    let normalized_query = normalize(query);
    let normalized_primary = normalize(primary);

    if normalized_query.is_empty() {
        return TextMatchMeta {
            rank: TextSimilarityRank::SubstringContains,
            primary_char_len: normalized_primary.chars().count(),
            hit_char_index: 0,
        };
    }

    if normalized_primary == normalized_query {
        return TextMatchMeta {
            rank: TextSimilarityRank::ExactMatch,
            primary_char_len: normalized_primary.chars().count(),
            hit_char_index: 0,
        };
    }

    if normalized_primary.starts_with(&normalized_query) {
        return TextMatchMeta {
            rank: TextSimilarityRank::PrefixMatch,
            primary_char_len: normalized_primary.chars().count(),
            hit_char_index: 0,
        };
    }

    if token_contains(&normalized_primary, &normalized_query) {
        return TextMatchMeta {
            rank: TextSimilarityRank::TokenContains,
            primary_char_len: normalized_primary.chars().count(),
            hit_char_index: find_query_char_index(&normalized_primary, &normalized_query),
        };
    }

    if let Some(index) = normalized_primary.find(&normalized_query) {
        return TextMatchMeta {
            rank: TextSimilarityRank::SubstringContains,
            primary_char_len: normalized_primary.chars().count(),
            hit_char_index: byte_index_to_char_index(&normalized_primary, index),
        };
    }

    if secondary.is_some_and(|note| normalize(note).contains(&normalized_query)) {
        return TextMatchMeta {
            rank: TextSimilarityRank::NoteContains,
            primary_char_len: normalized_primary.chars().count(),
            hit_char_index: usize::MAX,
        };
    }

    TextMatchMeta {
        rank: TextSimilarityRank::NoteContains,
        primary_char_len: normalized_primary.chars().count(),
        hit_char_index: usize::MAX,
    }
}

fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}

fn token_contains(text: &str, query: &str) -> bool {
    split_tokens(text).any(|token| token.contains(query))
}

fn split_tokens(text: &str) -> impl Iterator<Item = &str> {
    text.split(|character: char| {
        character.is_whitespace() || matches!(character, '-' | '_' | '/' | '·' | '|' | ':')
    })
    .filter(|token| !token.is_empty())
}

fn find_query_char_index(text: &str, query: &str) -> usize {
    if query.is_empty() {
        return 0;
    }

    let text_chars: Vec<char> = text.chars().collect();
    let query_chars: Vec<char> = query.chars().collect();
    for (index, window) in text_chars.windows(query_chars.len()).enumerate() {
        if window == query_chars.as_slice() {
            return index;
        }
    }

    usize::MAX
}

fn byte_index_to_char_index(text: &str, byte_index: usize) -> usize {
    text.char_indices()
        .take_while(|(index, _)| *index < byte_index)
        .count()
}

fn task_actionability_rank(status: &str) -> QuickTaskActionabilityRank {
    match status {
        "doing" => QuickTaskActionabilityRank::Doing,
        "todo" => QuickTaskActionabilityRank::Todo,
        "waiting" => QuickTaskActionabilityRank::Waiting,
        "done" => QuickTaskActionabilityRank::Done,
        _ => QuickTaskActionabilityRank::Canceled,
    }
}

fn project_lifecycle_rank(completed_at: Option<&String>) -> QuickProjectLifecycleRank {
    if completed_at.is_some() {
        QuickProjectLifecycleRank::Completed
    } else {
        QuickProjectLifecycleRank::Active
    }
}

fn space_context_rank(space_id: &str, scope: &QuickSearchScopeContext) -> SpaceContextRank {
    if scope
        .current_space_id
        .as_deref()
        .is_some_and(|current| current == space_id)
    {
        return SpaceContextRank::Current;
    }

    if scope
        .default_space_id
        .as_deref()
        .is_some_and(|default| default == space_id)
    {
        return SpaceContextRank::Default;
    }

    SpaceContextRank::Other
}

#[cfg(test)]
mod tests {
    use super::{
        classify_text_match, rank_quick_create_tasks, QuickSearchScopeContext, TextSimilarityRank,
    };
    use crate::quick_create::QuickTaskItemDto;

    fn sample_task(
        id: &str,
        title: &str,
        status: &str,
        priority: i32,
        space_id: &str,
    ) -> QuickTaskItemDto {
        QuickTaskItemDto {
            id: id.to_owned(),
            space_id: space_id.to_owned(),
            space_name: "Space".to_owned(),
            project_id: None,
            project_name: None,
            inbox_at: None,
            title: title.to_owned(),
            note: None,
            priority,
            status: status.to_owned(),
            updated_at: "2026-06-15T10:00:00Z".to_owned(),
            completed_at: None,
        }
    }

    #[test]
    fn exact_title_should_rank_before_longer_prefix_match() {
        let exact = classify_text_match("111", None, "111");
        let longer = classify_text_match("1111", None, "111");

        assert_eq!(exact.rank, TextSimilarityRank::ExactMatch);
        assert_eq!(longer.rank, TextSimilarityRank::PrefixMatch);
        assert!(exact.rank < longer.rank);
    }

    #[test]
    fn rank_quick_create_tasks_should_prioritize_exact_match_and_active_status() {
        let mut tasks = vec![
            sample_task("canceled", "1111", "canceled", 0, "space-a"),
            sample_task("exact", "111", "canceled", 0, "space-a"),
            sample_task("doing", "111", "doing", 0, "space-a"),
        ];

        rank_quick_create_tasks(&mut tasks, "111", &QuickSearchScopeContext::default());

        assert_eq!(tasks[0].id, "doing");
        assert_eq!(tasks[1].id, "exact");
        assert_eq!(tasks[2].id, "canceled");
    }

    #[test]
    fn rank_quick_create_tasks_should_boost_current_space() {
        let mut tasks = vec![
            sample_task("other-space", "111", "todo", 0, "space-b"),
            sample_task("current-space", "111", "todo", 0, "space-a"),
        ];

        rank_quick_create_tasks(
            &mut tasks,
            "111",
            &QuickSearchScopeContext {
                current_space_id: Some("space-a".to_owned()),
                default_space_id: None,
            },
        );

        assert_eq!(tasks[0].id, "current-space");
    }
}
