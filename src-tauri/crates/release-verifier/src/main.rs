use std::{env, ffi::OsString, fs, path::PathBuf, process::ExitCode};

use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};

fn required_arg(
    args: &mut impl Iterator<Item = OsString>,
    owner: &str,
) -> Result<OsString, String> {
    args.next().ok_or_else(|| format!("缺少 {owner}"))
}

fn decode_text(value: &str, owner: &str) -> Result<String, String> {
    let bytes = STANDARD
        .decode(value.trim())
        .map_err(|error| format!("{owner} 不是有效 Base64：{error}"))?;
    String::from_utf8(bytes).map_err(|error| format!("{owner} 不是有效 UTF-8：{error}"))
}

fn verify() -> Result<(), String> {
    let mut args = env::args_os().skip(1);
    let artifact_path = PathBuf::from(required_arg(&mut args, "artifact path")?);
    let signature_base64 = required_arg(&mut args, "updater signature")?
        .into_string()
        .map_err(|_| "updater signature 必须是 UTF-8".to_string())?;
    let public_key = required_arg(&mut args, "updater public key")?
        .into_string()
        .map_err(|_| "updater public key 必须是 UTF-8".to_string())?;
    if args.next().is_some() {
        return Err("验签命令包含多余参数".to_string());
    }

    let artifact =
        fs::read(&artifact_path).map_err(|error| format!("读取 updater 产物失败：{error}"))?;
    let public_key = PublicKey::decode(&decode_text(&public_key, "updater public key")?)
        .map_err(|error| format!("解析 updater public key 失败：{error}"))?;
    let signature = Signature::decode(&decode_text(&signature_base64, "updater signature")?)
        .map_err(|error| format!("解析 updater signature 失败：{error}"))?;

    public_key
        .verify(&artifact, &signature, true)
        .map_err(|error| format!("updater 签名与应用公钥不匹配：{error}"))
}

fn main() -> ExitCode {
    match verify() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}
