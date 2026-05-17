package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.MealType;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.MealTypeRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.CreateMealTypeRequest;
import backend.recetarioPersonal.view.MealTypeDto;
import backend.recetarioPersonal.view.UpdateMealTypeRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class MealTypeService {

    private final MealTypeRepository mealTypeRepository;
    private final UserRepository userRepository;

    public MealTypeService(MealTypeRepository mealTypeRepository, UserRepository userRepository) {
        this.mealTypeRepository = mealTypeRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<MealTypeDto> findAll(long userId) {
        ensureUserExists(userId);
        List<MealTypeDto> result = new ArrayList<>();
        mealTypeRepository.findByOwnerUserIdIsNullOrderByDefaultSortOrderAsc()
                .forEach(m -> result.add(toDto(m)));
        mealTypeRepository.findByOwner_UserIdOrderByNameAsc(userId)
                .forEach(m -> result.add(toDto(m)));
        return result;
    }

    @Transactional(readOnly = true)
    public List<MealTypeDto> search(long userId, String query) {
        ensureUserExists(userId);
        String q = normalize(query);
        if (q.isEmpty()) {
            return findAll(userId);
        }

        List<MealTypeDto> result = new ArrayList<>();
        mealTypeRepository.searchSystemByNameContaining(q)
                .forEach(m -> result.add(toDto(m)));
        mealTypeRepository.searchByOwnerAndNameContaining(userId, q)
                .forEach(m -> result.add(toDto(m)));
        return result;
    }

    @Transactional
    public MealTypeDto create(long userId, CreateMealTypeRequest request) {
        String normalized = normalize(request.name());
        validateCustomNameForCreate(userId, normalized);

        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        MealType mealType = new MealType();
        mealType.setOwner(owner);
        mealType.setName(normalized);
        mealType.setSystem(false);
        mealType.setDefaultSortOrder(0);

        return toDto(mealTypeRepository.save(mealType));
    }

    @Transactional
    public MealTypeDto update(long userId, Long mealTypeId, UpdateMealTypeRequest request) {
        MealType mealType = findOwnedCustomOrThrow(userId, mealTypeId);
        String normalized = normalize(request.name());
        validateCustomNameForUpdate(userId, mealTypeId, normalized);

        mealType.setName(normalized);
        return toDto(mealTypeRepository.save(mealType));
    }

    @Transactional
    public void delete(long userId, Long mealTypeId) {
        MealType mealType = findOwnedCustomOrThrow(userId, mealTypeId);
        mealTypeRepository.delete(mealType);
    }

    @Transactional
    public MealTypeDto findOrCreateCustom(long userId, String rawName) {
        String normalized = normalize(rawName);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("El nombre del tipo de comida es obligatorio.");
        }

        return mealTypeRepository.findByOwnerIsNullAndNameIgnoreCase(normalized)
                .map(this::toDto)
                .or(() -> mealTypeRepository.findByOwner_UserIdAndNameIgnoreCase(userId, normalized).map(this::toDto))
                .orElseGet(() -> create(userId, new CreateMealTypeRequest(normalized)));
    }

    private MealType findOwnedCustomOrThrow(long userId, Long mealTypeId) {
        MealType mealType = mealTypeRepository.findById(mealTypeId)
                .orElseThrow(() -> new IllegalArgumentException("Tipo de comida no encontrado: " + mealTypeId));

        if (mealType.isSystem()) {
            throw new IllegalArgumentException("Los tipos de comida del sistema no se pueden modificar.");
        }
        if (mealType.getOwner() == null || mealType.getOwner().getUserId() != userId) {
            throw new IllegalArgumentException("El tipo de comida no pertenece al usuario.");
        }
        return mealType;
    }

    private void validateCustomNameForCreate(long userId, String normalized) {
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("El nombre del tipo de comida es obligatorio.");
        }
        if (conflictsWithSystemName(normalized)) {
            throw new IllegalArgumentException("Ese nombre está reservado para un tipo del sistema.");
        }
        if (mealTypeRepository.existsByOwner_UserIdAndNameIgnoreCase(userId, normalized)) {
            throw new IllegalArgumentException("Ya existe un tipo de comida con ese nombre.");
        }
    }

    private void validateCustomNameForUpdate(long userId, Long mealTypeId, String normalized) {
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("El nombre del tipo de comida es obligatorio.");
        }
        if (conflictsWithSystemName(normalized)) {
            throw new IllegalArgumentException("Ese nombre está reservado para un tipo del sistema.");
        }
        mealTypeRepository.findByOwner_UserIdAndNameIgnoreCase(userId, normalized).ifPresent(existing -> {
            if (!existing.getMealTypeId().equals(mealTypeId)) {
                throw new IllegalArgumentException("Ya existe un tipo de comida con ese nombre.");
            }
        });
    }

    private boolean conflictsWithSystemName(String normalized) {
        return mealTypeRepository.findByOwnerUserIdIsNullOrderByDefaultSortOrderAsc().stream()
                .anyMatch(m -> m.getName().equalsIgnoreCase(normalized));
    }

    private void ensureUserExists(long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("Usuario no encontrado: " + userId);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private MealTypeDto toDto(MealType m) {
        return new MealTypeDto(
                m.getMealTypeId(),
                m.getName(),
                m.isSystem(),
                m.getDefaultSortOrder()
        );
    }

    @Transactional
    public MealType resolveForAssignment(long userId, Long mealTypeId, String mealTypeName) {
        if (mealTypeId != null) {
            MealType mealType = mealTypeRepository.findById(mealTypeId)
                    .orElseThrow(() -> new IllegalArgumentException("Tipo de comida no encontrado: " + mealTypeId));
    
            if (!mealType.isSystem()) {
                if (mealType.getOwner() == null || mealType.getOwner().getUserId() != userId) {
                    throw new IllegalArgumentException("El tipo de comida no pertenece al usuario.");
                }
            }
            return mealType;
        }
    
        String normalized = normalize(mealTypeName);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Debes indicar mealTypeId o mealTypeName.");
        }
    
        return mealTypeRepository.findByOwnerIsNullAndNameIgnoreCase(normalized)
                .or(() -> mealTypeRepository.findByOwner_UserIdAndNameIgnoreCase(userId, normalized))
                .orElseGet(() -> {
                    if (conflictsWithSystemName(normalized)) {
                        throw new IllegalArgumentException("Ese nombre está reservado para un tipo del sistema.");
                    }
                    User owner = userRepository.findById(userId)
                            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));
                    MealType created = new MealType();
                    created.setOwner(owner);
                    created.setName(normalized);
                    created.setSystem(false);
                    created.setDefaultSortOrder(0);
                    return mealTypeRepository.save(created);
                });
    }
}