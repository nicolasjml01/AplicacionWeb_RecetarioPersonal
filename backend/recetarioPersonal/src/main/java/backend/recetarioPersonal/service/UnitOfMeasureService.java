package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.UnitOfMeasure;
import backend.recetarioPersonal.repository.UnitOfMeasureRepository;
import backend.recetarioPersonal.view.UnitOfMeasureDto;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UnitOfMeasureService {

    private final UnitOfMeasureRepository unitRepository;

    public UnitOfMeasureService(UnitOfMeasureRepository unitRepository) {
        this.unitRepository = unitRepository;
    }

    /**
     * Returns all units of measure. Used for the dropdown in the frontend.
     */
    public List<UnitOfMeasureDto> findAll() {
        return unitRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns the unit with the given name, or creates it if it does not exist.
     * Used when adding an item to the shopping list (analogous to IngredientService.findOrCreateByName).
     */
    public UnitOfMeasure findOrCreateByName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Unit of measure name cannot be blank");
        }
        String trimmed = name.trim();
        Optional<UnitOfMeasure> existing = unitRepository.findByNameIgnoreCase(trimmed);
        if (existing.isPresent()) {
            return existing.get();
        }
        UnitOfMeasure newUnit = new UnitOfMeasure();
        newUnit.setName(trimmed);
        newUnit.setSymbol(null);
        return unitRepository.save(newUnit);
    }

    /**
     * Optional: find by name without creating. Returns null if not found.
     */
    public UnitOfMeasure findByName(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        return unitRepository.findByNameIgnoreCase(name.trim()).orElse(null);
    }

    private UnitOfMeasureDto toDto(UnitOfMeasure unit) {
        return new UnitOfMeasureDto(
                unit.getUnitId(),
                unit.getName(),
                unit.getSymbol()
        );
    }
}