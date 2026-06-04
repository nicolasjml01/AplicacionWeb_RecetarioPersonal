package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.UnitOfMeasureService;
import backend.recetarioPersonal.view.DeleteOwnedUnitResponse;
import backend.recetarioPersonal.view.UnitOfMeasureDto;
import backend.recetarioPersonal.view.UpdateOwnedUnitRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/units-of-measure")
public class UserUnitOfMeasureController {

    private final UnitOfMeasureService unitOfMeasureService;

    public UserUnitOfMeasureController(UnitOfMeasureService unitOfMeasureService) {
        this.unitOfMeasureService = unitOfMeasureService;
    }

    /** Catalog + user-owned units (dropdowns, parsers). */
    @GetMapping
    public ResponseEntity<List<UnitOfMeasureDto>> listVisible(@PathVariable long userId) {
        return ResponseEntity.ok(unitOfMeasureService.findAllVisibleToUser(userId));
    }

    /** User-created units only (account management). */
    @GetMapping("/owned")
    public ResponseEntity<List<UnitOfMeasureDto>> listOwned(@PathVariable long userId) {
        return ResponseEntity.ok(unitOfMeasureService.listCreatedByUser(userId));
    }

    @PatchMapping("/{unitId}")
    public ResponseEntity<UnitOfMeasureDto> updateOwned(
            @PathVariable long userId,
            @PathVariable long unitId,
            @RequestBody @Valid UpdateOwnedUnitRequest request) {
        return ResponseEntity.ok(unitOfMeasureService.updateOwnedUnit(userId, unitId, request));
    }

    @DeleteMapping("/{unitId}")
    public ResponseEntity<DeleteOwnedUnitResponse> deleteOwned(
            @PathVariable long userId,
            @PathVariable long unitId) {
        return ResponseEntity.ok(unitOfMeasureService.deleteOwnedUnit(userId, unitId));
    }
}
