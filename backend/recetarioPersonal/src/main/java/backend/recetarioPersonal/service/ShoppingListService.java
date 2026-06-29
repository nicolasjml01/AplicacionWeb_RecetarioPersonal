package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.ShoppingListItem;
import backend.recetarioPersonal.model.UnitOfMeasure;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.ShoppingListItemRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.CreateShoppingListItemRequest;
import backend.recetarioPersonal.view.IngredientDto;
import backend.recetarioPersonal.view.ShoppingListItemDto;
import backend.recetarioPersonal.view.UnitOfMeasureDto;
import backend.recetarioPersonal.view.UpdateShoppingListItemRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ShoppingListService {

    private final ShoppingListItemRepository itemRepository;
    private final UserRepository userRepository;
    private final IngredientService ingredientService;
    private final UnitOfMeasureService unitOfMeasureService;
    private final RecentIngredientService recentIngredientService;

    public ShoppingListService(
            ShoppingListItemRepository itemRepository,
            UserRepository userRepository,
            IngredientService ingredientService,
            UnitOfMeasureService unitOfMeasureService,
            RecentIngredientService recentIngredientService
    ) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.ingredientService = ingredientService;
        this.unitOfMeasureService = unitOfMeasureService;
        this.recentIngredientService = recentIngredientService;
    }

    /**
     * Adds an item to the user's shopping list.
     * If an open item with same ingredient+unit exists, it sums quantity.
     */
    @Transactional
    public ShoppingListItemDto addItem(long userId, CreateShoppingListItemRequest request) {
        if (request.ingredientName() == null || request.ingredientName().isBlank()) {
            throw new IllegalArgumentException("ingredientName is required");
        }
        return addOrMergeItem(
            userId,
            request.ingredientName(),
            request.quantity(),
            request.measurementUnit(),
            request.ingredientCategoryId()
        );
    }

    /**
     * Shared behavior for imports and manual add:
     * merge by same user + same ingredient + same unit + bought=false.
     */
    @Transactional
    public ShoppingListItemDto addOrMergeItem(
            long userId,
            String ingredientName,
            float quantity,
            String measurementUnit
    ) {
        return addOrMergeItem(userId, ingredientName, quantity, measurementUnit, null);
    }

    @Transactional
    public ShoppingListItemDto addOrMergeItem(
            long userId,
            String ingredientName,
            float quantity,
            String measurementUnit,
            Long ingredientCategoryIdForCreate
    ) {
        if (ingredientName == null || ingredientName.isBlank()) {
            throw new IllegalArgumentException("ingredientName is required");
        }
        if (quantity < 0) {
            throw new IllegalArgumentException("quantity must be >= 0");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Ingredient ingredient = ingredientService.findOrCreateByName(ingredientName, userId, ingredientCategoryIdForCreate);

        UnitOfMeasure unit = null;
        if (measurementUnit != null && !measurementUnit.isBlank()) {
            unit = unitOfMeasureService.findOrCreateByName(measurementUnit.trim(), userId);
        }

        Long unitId = unit != null ? unit.getUnitId() : null;
        ShoppingListItem merged = itemRepository
                .findOpenByUserIngredientAndUnit(userId, ingredient.getIngredientId(), unitId)
                .orElse(null);

        if (merged != null) {
            merged.setQuantity(merged.getQuantity() + quantity);
            merged = itemRepository.save(merged);
            return toDto(merged);
        }

        ShoppingListItem item = new ShoppingListItem();
        item.setUser(user);
        item.setIngredient(ingredient);
        item.setQuantity(quantity);
        item.setUnitOfMeasure(unit);
        item.setBought(false);
        item = itemRepository.save(item);

        return toDto(item);
    }

    @Transactional(readOnly = true)
    public List<ShoppingListItemDto> getItemsByUser(long userId) {
        return itemRepository.findByUser_UserIdAndBoughtFalse(userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ShoppingListItemDto updateItem(Long itemId, long userId, UpdateShoppingListItemRequest request) {
        ShoppingListItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Shopping list item not found: " + itemId));

        if (item.getUser().getUserId() != userId) {
            throw new IllegalArgumentException("Item does not belong to user");
        }

        if (Boolean.TRUE.equals(request.bought())) {
            recentIngredientService.touch(userId, item.getIngredient());
            itemRepository.delete(item);
            return null;
        }

        if (request.quantity() != null) {
            item.setQuantity(request.quantity());
        }

        if (request.measurementUnit() != null) {
            if (request.measurementUnit().isBlank()) {
                item.setUnitOfMeasure(null);
            } else {
                item.setUnitOfMeasure(unitOfMeasureService.findOrCreateByName(request.measurementUnit(), userId));
            }
        }

        item = itemRepository.save(item);
        return toDto(item);
    }

    public void deleteItem(Long itemId, long userId) {
        ShoppingListItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Shopping list item not found: " + itemId));

        if (item.getUser().getUserId() != userId) {
            throw new IllegalArgumentException("Item does not belong to user");
        }

        recentIngredientService.touch(userId, item.getIngredient());
        itemRepository.delete(item);
    }

    private ShoppingListItemDto toDto(ShoppingListItem item) {
        IngredientDto ingredientDto = ingredientToDto(item.getIngredient());

        UnitOfMeasureDto unitDto = item.getUnitOfMeasure() != null
                ? unitOfMeasureService.toDto(item.getUnitOfMeasure())
                : null;

        return new ShoppingListItemDto(
                item.getShoppingListItemId(),
                item.getUser().getUserId(),
                ingredientDto,
                item.getQuantity(),
                unitDto,
                item.isBought()
        );
    }

    private IngredientDto ingredientToDto(Ingredient ing) {
        return ingredientService.toDto(ing);
    }
}