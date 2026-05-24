class DomainException(Exception):
    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
        super().__init__(self.message)

class InvalidStateTransitionException(DomainException):
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            message=f"Transisi status dari {from_status} ke {to_status} tidak diperbolehkan.",
            code="INVALID_STATE_TRANSITION"
        )

class EntityNotFoundException(DomainException):
    def __init__(self, entity_name: str, entity_id: str):
        super().__init__(
            message=f"{entity_name} dengan ID {entity_id} tidak ditemukan.",
            code=f"{entity_name.upper()}_NOT_FOUND"
        )

class DuplicateActiveIncidentException(DomainException):
    def __init__(self, machine_code: str):
        super().__init__(
            message=f"Mesin {machine_code} sudah memiliki laporan insiden aktif yang belum selesai.",
            code="DUPLICATE_ACTIVE_INCIDENT"
        )