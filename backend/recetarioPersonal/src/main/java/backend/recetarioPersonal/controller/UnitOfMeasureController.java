package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.UnitOfMeasureService;
import backend.recetarioPersonal.view.UnitOfMeasureDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/units-of-measure")
public class UnitOfMeasureController {

    private final UnitOfMeasureService unitOfMeasureService;

    public UnitOfMeasureController(UnitOfMeasureService unitOfMeasureService) {
        this.unitOfMeasureService = unitOfMeasureService;
    }

    @GetMapping
    public ResponseEntity<List<UnitOfMeasureDto>> getUnits() {
        return ResponseEntity.ok(unitOfMeasureService.findAll());
    }
}