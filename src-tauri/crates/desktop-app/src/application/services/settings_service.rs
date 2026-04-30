//! Settings Service：阶段 3 只承载 Sidebar 配置的业务规则。

use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_entity::common::ActivityEntityKind;

use crate::{
    app::error::AppError,
    application::activity::{
        ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput,
    },
    domain::now_utc,
    infrastructure::repositories::SettingsRepository,
};

const SIDEBAR_SETTING_KEY: &str = "app.sidebar";
const SIDEBAR_WIDTH_MIN: u16 = 220;
const SIDEBAR_WIDTH_MAX: u16 = 330;

/// Sidebar 主区单项开关。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SidebarMainItemKey {
    #[serde(rename = "inbox")]
    Inbox,
    #[serde(rename = "allTasks")]
    AllTasks,
    #[serde(rename = "views")]
    Views,
    #[serde(rename = "projectOverview")]
    ProjectOverview,
}

impl SidebarMainItemKey {
    fn json_key(self) -> &'static str {
        match self {
            Self::Inbox => "inbox",
            Self::AllTasks => "allTasks",
            Self::Views => "views",
            Self::ProjectOverview => "projectOverview",
        }
    }
}

/// Sidebar footer 仅允许这两个固定入口。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SidebarFooterItemKey {
    #[serde(rename = "archive")]
    Archive,
    #[serde(rename = "trash")]
    Trash,
}

impl SidebarFooterItemKey {
    fn json_key(self) -> &'static str {
        match self {
            Self::Archive => "archive",
            Self::Trash => "trash",
        }
    }
}

/// 桌面态 sidebar 偏好。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum SidebarDesktopPreference {
    #[default]
    Expanded,
    Collapsed,
}

/// 可见性与排序配置。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarItemConfig {
    pub visible: bool,
    pub order: i32,
}

/// 主导航配置。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarMainItems {
    pub inbox: SidebarItemConfig,
    #[serde(rename = "allTasks")]
    pub all_tasks: SidebarItemConfig,
    pub views: SidebarItemConfig,
    #[serde(rename = "projectOverview")]
    pub project_overview: SidebarItemConfig,
}

impl SidebarMainItems {
    fn visible_count(&self) -> usize {
        [
            self.inbox.visible,
            self.all_tasks.visible,
            self.views.visible,
            self.project_overview.visible,
        ]
        .into_iter()
        .filter(|visible| *visible)
        .count()
    }

    fn item_mut(&mut self, key: SidebarMainItemKey) -> &mut SidebarItemConfig {
        match key {
            SidebarMainItemKey::Inbox => &mut self.inbox,
            SidebarMainItemKey::AllTasks => &mut self.all_tasks,
            SidebarMainItemKey::Views => &mut self.views,
            SidebarMainItemKey::ProjectOverview => &mut self.project_overview,
        }
    }
}

/// Footer 配置。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarFooterItems {
    pub archive: SidebarItemConfig,
    pub trash: SidebarItemConfig,
}

impl SidebarFooterItems {
    fn item_mut(&mut self, key: SidebarFooterItemKey) -> &mut SidebarItemConfig {
        match key {
            SidebarFooterItemKey::Archive => &mut self.archive,
            SidebarFooterItemKey::Trash => &mut self.trash,
        }
    }
}

/// Projects 分区配置。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarProjectSectionConfig {
    pub visible: bool,
    pub order: i32,
    pub collapsed: bool,
    pub show_counts: bool,
    pub show_completed: bool,
    pub max_visible: Option<u16>,
}

/// Sidebar setting 完整结构。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarSettings {
    pub main_items: SidebarMainItems,
    pub project_section: SidebarProjectSectionConfig,
    pub footer_items: SidebarFooterItems,
    pub width: u16,
    #[serde(default)]
    pub desktop_preference: SidebarDesktopPreference,
}

/// Rust command 返回的 typed payload。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSidebarSettingsOutput {
    pub settings: SidebarSettings,
}

/// 更新主区或 footer 某一项的可见性。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "kind", content = "key", rename_all = "camelCase")]
pub enum SidebarItemVisibilityTarget {
    Main(SidebarMainItemKey),
    Footer(SidebarFooterItemKey),
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSidebarItemVisibilityInput {
    pub target: SidebarItemVisibilityTarget,
    pub visible: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSidebarWidthInput {
    pub width: u16,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSidebarProjectSectionInput {
    pub config: SidebarProjectSectionConfig,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSidebarDesktopPreferenceInput {
    pub desktop_preference: SidebarDesktopPreference,
}

#[derive(Debug, Clone)]
pub struct SettingsService {
    repository: SettingsRepository,
    activity_service: ActivityService,
}

impl SettingsService {
    pub fn new(repository: SettingsRepository, activity_service: ActivityService) -> Self {
        Self {
            repository,
            activity_service,
        }
    }

    pub fn repository(&self) -> &SettingsRepository {
        &self.repository
    }

    /// 读取 Sidebar settings，并对旧数据做阶段 3 规范化。
    pub async fn get_sidebar_settings(&self) -> Result<SidebarSettings, AppError> {
        let settings = self
            .repository
            .get_json_setting::<SidebarSettings>(SIDEBAR_SETTING_KEY)
            .await?;
        normalize_sidebar_settings(settings)
    }

    /// 更新单个可见性开关。
    pub async fn update_sidebar_item_visibility(
        &self,
        input: UpdateSidebarItemVisibilityInput,
    ) -> Result<SidebarSettings, AppError> {
        let mut settings = self.get_sidebar_settings().await?;
        let mut changes = Vec::new();

        match input.target {
            SidebarItemVisibilityTarget::Main(key) => {
                {
                    let item = settings.main_items.item_mut(key);
                    if item.visible != input.visible {
                        changes.push(ActivityChangeInput {
                            field: format!("mainItems.{}.visible", key.json_key()),
                            old_value: Some(json!(item.visible)),
                            new_value: Some(json!(input.visible)),
                        });
                        item.visible = input.visible;
                    }
                }

                validate_main_items(&settings.main_items)?;
            }
            SidebarItemVisibilityTarget::Footer(key) => {
                let item = settings.footer_items.item_mut(key);
                if item.visible != input.visible {
                    changes.push(ActivityChangeInput {
                        field: format!("footerItems.{}.visible", key.json_key()),
                        old_value: Some(json!(item.visible)),
                        new_value: Some(json!(input.visible)),
                    });
                    item.visible = input.visible;
                }
            }
        }

        self.persist_sidebar_settings(settings, changes).await
    }

    /// 更新 Sidebar 宽度，并统一夹紧到既有 UI 范围。
    pub async fn update_sidebar_width(
        &self,
        input: UpdateSidebarWidthInput,
    ) -> Result<SidebarSettings, AppError> {
        let mut settings = self.get_sidebar_settings().await?;
        let next_width = clamp_sidebar_width(input.width);

        let changes = if settings.width == next_width {
            Vec::new()
        } else {
            let previous = settings.width;
            settings.width = next_width;
            vec![ActivityChangeInput {
                field: "width".to_owned(),
                old_value: Some(json!(previous)),
                new_value: Some(json!(next_width)),
            }]
        };

        self.persist_sidebar_settings(settings, changes).await
    }

    /// 更新 Projects 分区配置。
    pub async fn update_sidebar_project_section(
        &self,
        input: UpdateSidebarProjectSectionInput,
    ) -> Result<SidebarSettings, AppError> {
        validate_project_section(&input.config)?;

        let mut settings = self.get_sidebar_settings().await?;
        let previous = settings.project_section.clone();
        settings.project_section = input.config;

        let mut changes = Vec::new();
        push_change_if_needed(
            &mut changes,
            "projectSection.visible",
            json!(previous.visible),
            json!(settings.project_section.visible),
        );
        push_change_if_needed(
            &mut changes,
            "projectSection.order",
            json!(previous.order),
            json!(settings.project_section.order),
        );
        push_change_if_needed(
            &mut changes,
            "projectSection.collapsed",
            json!(previous.collapsed),
            json!(settings.project_section.collapsed),
        );
        push_change_if_needed(
            &mut changes,
            "projectSection.showCounts",
            json!(previous.show_counts),
            json!(settings.project_section.show_counts),
        );
        push_change_if_needed(
            &mut changes,
            "projectSection.showCompleted",
            json!(previous.show_completed),
            json!(settings.project_section.show_completed),
        );
        push_change_if_needed(
            &mut changes,
            "projectSection.maxVisible",
            json!(previous.max_visible),
            json!(settings.project_section.max_visible),
        );

        self.persist_sidebar_settings(settings, changes).await
    }

    /// 更新桌面态展开/收起偏好。
    pub async fn update_sidebar_desktop_preference(
        &self,
        input: UpdateSidebarDesktopPreferenceInput,
    ) -> Result<SidebarSettings, AppError> {
        let mut settings = self.get_sidebar_settings().await?;
        let changes = if settings.desktop_preference == input.desktop_preference {
            Vec::new()
        } else {
            let previous = settings.desktop_preference;
            settings.desktop_preference = input.desktop_preference;
            vec![ActivityChangeInput {
                field: "desktopPreference".to_owned(),
                old_value: Some(json!(previous)),
                new_value: Some(json!(input.desktop_preference)),
            }]
        };

        self.persist_sidebar_settings(settings, changes).await
    }

    async fn persist_sidebar_settings(
        &self,
        settings: SidebarSettings,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<SidebarSettings, AppError> {
        let normalized = normalize_sidebar_settings(settings)?;
        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;

        self.repository
            .set_json_setting_in_connection(
                &transaction,
                SIDEBAR_SETTING_KEY,
                &normalized,
                &updated_at,
            )
            .await?;

        if !changes.is_empty() {
            self.activity_service
                .record_activity_in_txn(
                    &transaction,
                    RecordActivityInput {
                        entity_type: ActivityEntityKind::Setting,
                        entity_id: SIDEBAR_SETTING_KEY.to_owned(),
                        action: ActivityAction::SettingsUpdated,
                        actor_type: None,
                        source: None,
                        summary: Some("更新 Sidebar 设置".to_owned()),
                        metadata: Some(json!({ "settingKey": SIDEBAR_SETTING_KEY })),
                        changes,
                    },
                )
                .await?;
        }

        transaction.commit().await?;
        Ok(normalized)
    }
}

fn normalize_sidebar_settings(mut settings: SidebarSettings) -> Result<SidebarSettings, AppError> {
    settings.width = clamp_sidebar_width(settings.width);
    validate_project_section(&settings.project_section)?;
    validate_main_items(&settings.main_items)?;
    Ok(settings)
}

fn clamp_sidebar_width(width: u16) -> u16 {
    width.clamp(SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX)
}

fn validate_main_items(main_items: &SidebarMainItems) -> Result<(), AppError> {
    if main_items.visible_count() == 0 {
        return Err(AppError::validation("Sidebar 主导航至少保留一个可见入口"));
    }

    Ok(())
}

fn validate_project_section(config: &SidebarProjectSectionConfig) -> Result<(), AppError> {
    if matches!(config.max_visible, Some(0)) {
        return Err(AppError::validation(
            "Sidebar Projects maxVisible 必须大于 0 或为 null",
        ));
    }

    Ok(())
}

fn push_change_if_needed(
    changes: &mut Vec<ActivityChangeInput>,
    field: &str,
    old_value: serde_json::Value,
    new_value: serde_json::Value,
) {
    if old_value == new_value {
        return;
    }

    changes.push(ActivityChangeInput {
        field: field.to_owned(),
        old_value: Some(old_value),
        new_value: Some(new_value),
    });
}
