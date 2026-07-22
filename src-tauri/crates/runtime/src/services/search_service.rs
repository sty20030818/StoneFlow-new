//! Search Service（R2 stub）。

use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

pub use stoneflow_application::search::{
    SearchEntitiesInput, SearchEntitiesResultDto, SearchProjectItemDto, SearchTaskItemDto,
};

pub struct SearchService {
    _database: DatabaseRuntimeState,
}

impl SearchService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn search_entities(
        &self,
        _input: SearchEntitiesInput,
    ) -> Result<SearchEntitiesResultDto, AppError> {
        Ok(SearchEntitiesResultDto {
            tasks: Vec::new(),
            projects: Vec::new(),
            completed_tasks: Vec::new(),
            completed_projects: Vec::new(),
        })
    }
}
