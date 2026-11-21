import io
from typing import Optional, Tuple

from PIL import Image, ExifTags


def _decimal_from_dms(values, ref: str) -> Optional[float]:
    try:
        degrees = float(values[0])
        minutes = float(values[1])
        seconds = float(values[2])
        result = degrees + minutes / 60.0 + seconds / 3600.0
        return -result if ref in ("S", "W") else result
    except (IndexError, TypeError, ZeroDivisionError):
        return None


def extract_exif_location(image_bytes: bytes) -> Tuple[Optional[float], Optional[float], str]:
    try:
        exif = Image.open(io.BytesIO(image_bytes)).getexif()
        gps_info = exif.get_ifd(ExifTags.IFD.GPSInfo)
        latitude_ref = gps_info.get(ExifTags.GPS.GPSLatitudeRef)
        longitude_ref = gps_info.get(ExifTags.GPS.GPSLongitudeRef)
        latitude = _decimal_from_dms(gps_info.get(ExifTags.GPS.GPSLatitude), latitude_ref)
        longitude = _decimal_from_dms(gps_info.get(ExifTags.GPS.GPSLongitude), longitude_ref)
        if latitude is not None and longitude is not None:
            return latitude, longitude, "EXIF"
    except Exception:
        pass
    return None, None, "NONE"

