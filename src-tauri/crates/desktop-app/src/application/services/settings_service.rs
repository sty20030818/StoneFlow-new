//! Settings Service：只承载可同步 settings 的业务规则；设备私有偏好交给前端本地 store。

use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_schema::common::ActivityEntityKind;

use crate::{
    app::error::AppError,
    application::activity::{
        ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput,
    },
    domain::now_utc,
    infrastructure::repositories::SettingsRepository,
};

const SIDEBAR_PREFERENCE_SETTING_KEY: &str = "app.sidebar.preferences";
const LEGACY_SIDEBAR_SETTING_KEY: &str = "app.sidebar";
const LEGACY_UI_SETTING_KEY: &str = "app.ui";

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

/// 可同步的 Projects 分区配置。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarProjectSectionPreferenceConfig {
    pub visible: bool,
    pub order: i32,
    pub show_counts: bool,
    pub show_completed: bool,
}

/// Sidebar 可同步 setting 完整结构。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarPreferenceSettings {
    pub main_items: SidebarMainItems,
    pub project_section: SidebarProjectSectionPreferenceConfig,
    pub footer_items: SidebarFooterItems,
}

/// 供前端迁移一次性读取的 legacy sidebar 设备偏好。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacySidebarDevicePreferences {
    pub width: u16,
    pub desktop_preference: SidebarDesktopPreference,
    pub project_section_collapsed: bool,
    pub project_section_max_visible: Option<u16>,
}

/// 供前端迁移一次性读取的 legacy UI 设备偏好。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyUiDevicePreferences {
    pub task_drawer_width: u16,
}

/// Rust command 返回的 typed payload。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSidebarSettingsOutput {
    pub settings: SidebarPreferenceSettings,
}

/// 只读 legacy 设备偏好，供前端首次迁移本地 JSON store。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLegacyShellDevicePreferencesOutput {
    pub sidebar: Option<LegacySidebarDevicePreferences>,
    pub ui: Option<LegacyUiDevicePreferences>,
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
pub struct UpdateSidebarProjectSectionInput {
    pub config: SidebarProjectSectionPreferenceConfig,
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

    /// 读取 Sidebar sync settings，并对 legacy DB 做只读兼容。
    pub async fn get_sidebar_settings(&self) -> Result<SidebarPreferenceSettings, AppError> {
        if let Some(settings) = self
            .repository
            .find_json_setting::<SidebarPreferenceSettings>(SIDEBAR_PREFERENCE_SETTING_KEY)
            .await?
        {
            return normalize_sidebar_settings(settings);
        }

        if let Some(legacy_settings) = self
            .repository
            .find_json_setting::<LegacySidebarSettings>(LEGACY_SIDEBAR_SETTING_KEY)
            .await?
        {
            return normalize_sidebar_settings(extract_sidebar_preferences(legacy_settings));
        }

        Err(AppError::not_found(format!(
            "setting `{SIDEBAR_PREFERENCE_SETTING_KEY}` 不存在"
        )))
    }

    /// 读取 legacy 设备偏好，供前端首次迁移本地 JSON store。
    pub async fn get_legacy_shell_device_preferences(
        &self,
    ) -> Result<GetLegacyShellDevicePreferencesOutput, AppError> {
        let sidebar = self
            .repository
            .find_json_setting::<LegacySidebarSettings>(LEGACY_SIDEBAR_SETTING_KEY)
            .await?
            .map(extract_legacy_sidebar_device_preferences);
        let ui = self
            .repository
            .find_json_setting::<LegacyUiSettings>(LEGACY_UI_SETTING_KEY)
            .await?
            .map(extract_legacy_ui_device_preferences);

        Ok(GetLegacyShellDevicePreferencesOutput { sidebar, ui })
    }

    /// 更新单个可见性开关。
    pub async fn update_sidebar_item_visibility(
        &self,
        input: UpdateSidebarItemVisibilityInput,
    ) -> Result<SidebarPreferenceSettings, AppError> {
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

    /// 更新可同步的 Projects 分区配置。
    pub async fn update_sidebar_project_section(
        &self,
        input: UpdateSidebarProjectSectionInput,
    ) -> Result<SidebarPreferenceSettings, AppError> {
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

        self.persist_sidebar_settings(settings, changes).await
    }

    async fn persist_sidebar_settings(
        &self,
        settings: SidebarPreferenceSettings,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<SidebarPreferenceSettings, AppError> {
        let normalized = normalize_sidebar_settings(settings)?;
        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;

        self.repository
            .set_json_setting_in_connection(
                &transaction,
                SIDEBAR_PREFERENCE_SETTING_KEY,
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
                        entity_id: SIDEBAR_PREFERENCE_SETTING_KEY.to_owned(),
                        action: ActivityAction::SettingsUpdated,
                        actor_type: None,
                        source: None,
                        summary: Some("更新 Sidebar 设置".to_owned()),
                        metadata: Some(json!({ "settingKey": SIDEBAR_PREFERENCE_SETTING_KEY })),
                        changes,
                    },
                )
                .await?;
        }

        transaction.commit().await?;
        Ok(normalized)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacySidebarProjectSectionConfig {
    visible: bool,
    order: i32,
    collapsed: bool,
    show_counts: bool,
    show_completed: bool,
    max_visible: Option<u16>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacySidebarSettings {
    main_items: SidebarMainItems,
    project_section: LegacySidebarProjectSectionConfig,
    footer_items: SidebarFooterItems,
    width: u16,
    #[serde(default)]
    desktop_preference: SidebarDesktopPreference,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyUiSettings {
    #[serde(default = "default_task_drawer_width")]
    task_drawer_width: u16,
}

fn normalize_sidebar_settings(
    settings: SidebarPreferenceSettings,
) -> Result<SidebarPreferenceSettings, AppError> {
    validate_main_items(&settings.main_items)?;
    Ok(settings)
}

fn validate_main_items(main_items: &SidebarMainItems) -> Result<(), AppError> {
    if main_items.visible_count() == 0 {
        return Err(AppError::validation("Sidebar 主导航至少保留一个可见入口"));
    }

    Ok(())
}

fn extract_sidebar_preferences(legacy: LegacySidebarSettings) -> SidebarPreferenceSettings {
    SidebarPreferenceSettings {
        main_items: legacy.main_items,
        project_section: SidebarProjectSectionPreferenceConfig {
            visible: legacy.project_section.visible,
            order: legacy.project_section.order,
            show_counts: legacy.project_section.show_counts,
            show_completed: legacy.project_section.show_completed,
        },
        footer_items: legacy.footer_items,
    }
}

fn extract_legacy_sidebar_device_preferences(
    legacy: LegacySidebarSettings,
) -> LegacySidebarDevicePreferences {
    LegacySidebarDevicePreferences {
        width: legacy.width,
        desktop_preference: legacy.desktop_preference,
        project_section_collapsed: legacy.project_section.collapsed,
        project_section_max_visible: legacy.project_section.max_visible,
    }
}

fn extract_legacy_ui_device_preferences(legacy: LegacyUiSettings) -> LegacyUiDevicePreferences {
    LegacyUiDevicePreferences {
        task_drawer_width: legacy.task_drawer_width,
    }
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

fn default_task_drawer_width() -> u16 {
    420
}
