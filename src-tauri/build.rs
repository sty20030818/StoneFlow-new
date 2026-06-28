use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

fn main() {
    println!("cargo::rustc-check-cfg=cfg(desktop)");
    println!("cargo::rustc-check-cfg=cfg(mobile)");
    println!("cargo:rerun-if-changed=crates/sync-worker/Cargo.toml");
    println!("cargo:rerun-if-changed=crates/sync-worker/src");
    // `libsql` 必须留在独立 sidecar，避免与主进程里的本地 SQLite 链路在 Windows 上重复链接。
    prepare_sync_worker_sidecar().expect("failed to prepare sync worker sidecar");
    tauri_build::build()
}

fn prepare_sync_worker_sidecar() -> Result<(), String> {
    let manifest_dir = PathBuf::from(
        env::var("CARGO_MANIFEST_DIR")
            .map_err(|error| format!("read CARGO_MANIFEST_DIR failed: {error}"))?,
    );
    let target_triple =
        env::var("TARGET").map_err(|error| format!("read TARGET failed: {error}"))?;
    let profile = env::var("PROFILE").map_err(|error| format!("read PROFILE failed: {error}"))?;
    let cargo = env::var("CARGO").unwrap_or_else(|_| "cargo".to_owned());
    let sidecar_target_dir = manifest_dir.join("target").join("sync-worker-sidecar");
    let binary_name = if target_triple.contains("windows") {
        "stoneflow-sync-worker.exe"
    } else {
        "stoneflow-sync-worker"
    };

    let mut command = Command::new(cargo);
    command
        .current_dir(&manifest_dir)
        .arg("build")
        .arg("--manifest-path")
        .arg(manifest_dir.join("Cargo.toml"))
        .arg("-p")
        .arg("stoneflow-sync-worker")
        .arg("--bin")
        .arg("stoneflow-sync-worker")
        .arg("--target")
        .arg(&target_triple)
        .env("CARGO_TARGET_DIR", &sidecar_target_dir);

    if profile != "debug" {
        command.arg("--profile").arg(&profile);
    }

    let status = command
        .status()
        .map_err(|error| format!("spawn sidecar cargo build failed: {error}"))?;
    if !status.success() {
        return Err(format!(
            "sidecar cargo build failed with status: {status}"
        ));
    }

    let built_binary = sidecar_binary_path(
        &sidecar_target_dir,
        &target_triple,
        &profile,
        binary_name,
    );
    if !built_binary.is_file() {
        return Err(format!(
            "sidecar binary missing after build: {}",
            built_binary.display()
        ));
    }

    let binaries_dir = manifest_dir.join("binaries");
    fs::create_dir_all(&binaries_dir)
        .map_err(|error| format!("create binaries dir failed: {error}"))?;
    let external_bin_name = if target_triple.contains("windows") {
        format!("stoneflow-sync-worker-{target_triple}.exe")
    } else {
        format!("stoneflow-sync-worker-{target_triple}")
    };
    let external_bin_path = binaries_dir.join(external_bin_name);
    copy_if_changed(&built_binary, &external_bin_path)?;

    Ok(())
}

fn sidecar_binary_path(
    target_dir: &Path,
    target_triple: &str,
    profile: &str,
    binary_name: &str,
) -> PathBuf {
    target_dir
        .join(target_triple)
        .join(profile)
        .join(binary_name)
}

fn copy_if_changed(from: &Path, to: &Path) -> Result<(), String> {
    let should_copy = match (fs::metadata(from), fs::metadata(to)) {
        (Ok(source), Ok(target)) => {
            source.len() != target.len()
                || source
                    .modified()
                    .ok()
                    .zip(target.modified().ok())
                    .map(|(source, target)| source > target)
                    .unwrap_or(true)
        }
        (Ok(_), Err(_)) => true,
        (Err(error), _) => {
            return Err(format!("read sidecar source metadata failed: {error}"));
        }
    };

    if !should_copy {
        return Ok(());
    }

    fs::copy(from, to).map_err(|error| {
        format!(
            "copy sidecar binary failed from {} to {}: {error}",
            from.display(),
            to.display()
        )
    })?;
    Ok(())
}
