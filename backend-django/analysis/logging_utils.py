import json
import logging


logger = logging.getLogger("clapo.analysis")


def _sanitize_metadata(metadata):
    out = {}
    for key, value in (metadata or {}).items():
        if value is None or isinstance(value, (str, int, float, bool)):
            out[key] = value
        elif isinstance(value, list):
            out[key] = [
                item if item is None or isinstance(item, (str, int, float, bool)) else str(item)
                for item in value
            ]
        else:
            out[key] = str(value)
    return out


def _log(level: str, event_name: str, metadata=None):
    payload = {
        "event": event_name,
        "level": level,
        **_sanitize_metadata(metadata),
    }
    line = json.dumps(payload)
    if level == "ERROR":
        logger.error(line)
    elif level == "WARN":
        logger.warning(line)
    else:
        logger.info(line)


def log_info(event_name: str, metadata=None):
    _log("INFO", event_name, metadata)


def log_warn(event_name: str, metadata=None):
    _log("WARN", event_name, metadata)


def log_error(event_name: str, metadata=None):
    _log("ERROR", event_name, metadata)
