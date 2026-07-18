//! Sidebar sync settings 命令。

use tauri::State;

use crate::app::error::AppError;
use crate::composition::build_settings_service;
use crate::services::{
	GetSidebarSettingsOutput, UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
};
use crate::sync;
use stoneflow_storage::database::DatabaseRuntimeState;

#[tauri::command]
pub async fn get_sidebar_settings(
	database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
	get_sidebar_settings_impl(database.inner()).await
}

#[tauri::command]
pub async fn update_sidebar_item_visibility(
	input: UpdateSidebarItemVisibilityInput,
	app_handle: tauri::AppHandle,
	database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
	let payload = update_sidebar_item_visibility_impl(database.inner(), input).await?;
	sync::note_local_write(&app_handle).await;
	Ok(payload)
}

#[tauri::command]
pub async fn update_sidebar_project_section(
	input: UpdateSidebarProjectSectionInput,
	app_handle: tauri::AppHandle,
	database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
	let payload = update_sidebar_project_section_impl(database.inner(), input).await?;
	sync::note_local_write(&app_handle).await;
	Ok(payload)
}

async fn get_sidebar_settings_impl(
	database: &DatabaseRuntimeState,
) -> Result<GetSidebarSettingsOutput, AppError> {
	let settings = build_settings_service(database)
		.get_sidebar_settings()
		.await?;
	Ok(GetSidebarSettingsOutput { settings })
}

async fn update_sidebar_item_visibility_impl(
	database: &DatabaseRuntimeState,
	input: UpdateSidebarItemVisibilityInput,
) -> Result<GetSidebarSettingsOutput, AppError> {
	let settings = build_settings_service(database)
		.update_sidebar_item_visibility(input)
		.await?;
	Ok(GetSidebarSettingsOutput { settings })
}

async fn update_sidebar_project_section_impl(
	database: &DatabaseRuntimeState,
	input: UpdateSidebarProjectSectionInput,
) -> Result<GetSidebarSettingsOutput, AppError> {
	let settings = build_settings_service(database)
		.update_sidebar_project_section(input)
		.await?;
	Ok(GetSidebarSettingsOutput { settings })
}

#[cfg(test)]
mod tests {
	use stoneflow_test_support::TestDatabase;

	use super::{
		get_sidebar_settings_impl, update_sidebar_item_visibility_impl,
		update_sidebar_project_section_impl,
	};
	use crate::services::{
		SidebarItemVisibilityTarget, SidebarMainItemKey, SidebarProjectSectionPreferenceConfig,
		UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
	};

	#[tokio::test]
	async fn get_sidebar_settings_command_should_return_typed_payload() {
		let database = TestDatabase::bootstrap_in_memory()
			.await
			.expect("test database should bootstrap");

		let payload = get_sidebar_settings_impl(&database)
			.await
			.expect("get sidebar settings should succeed");

		assert!(payload.settings.main_items.inbox.visible);
		assert!(payload.settings.project_section.show_counts);
	}

	#[tokio::test]
	async fn update_sidebar_item_visibility_command_should_persist() {
		let database = TestDatabase::bootstrap_in_memory()
			.await
			.expect("test database should bootstrap");

		let payload = update_sidebar_item_visibility_impl(
			&database,
			UpdateSidebarItemVisibilityInput {
				target: SidebarItemVisibilityTarget::Main(SidebarMainItemKey::Views),
				visible: false,
			},
		)
		.await
		.expect("update sidebar item visibility should succeed");

		assert!(!payload.settings.main_items.views.visible);
	}

	#[tokio::test]
	async fn update_sidebar_project_section_command_should_persist() {
		let database = TestDatabase::bootstrap_in_memory()
			.await
			.expect("test database should bootstrap");

		let payload = update_sidebar_project_section_impl(
			&database,
			UpdateSidebarProjectSectionInput {
				config: SidebarProjectSectionPreferenceConfig {
					visible: true,
					order: 500,
					show_counts: false,
					show_completed: false,
				},
			},
		)
		.await
		.expect("update sidebar project section should succeed");

		assert!(!payload.settings.project_section.show_counts);
		assert!(!payload.settings.project_section.show_completed);
	}
}
