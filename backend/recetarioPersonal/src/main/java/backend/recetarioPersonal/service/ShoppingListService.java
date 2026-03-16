package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.ShoppingListItem;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.ShoppingListItemRepository;
import backend.recetarioPersonal.repository.UserRepository;
import backend.recetarioPersonal.view.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ShoppingListService {

    private final ShoppingListItemRepository itemRepository;
    private final UserRepository userRepository;
    private final IngredientService ingredientService;

    public ShoppingListService(ShoppingListItemRepository itemRepository,
                              UserRepository userRepository,
                              IngredientService ingredientService) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.ingredientService = ingredientService;
    }

    /**
     * Adds an item to the user's shopping list. The ingredient is resolved by name (find-or-create).
     */
    @Transactional
    public ShoppingListItemDto addItem(long userId, CreateShoppingListItemRequest request) {
        if (request.ingredientName() == null || request.ingredientName().isBlank()) {
            throw new IllegalArgumentException("ingredientName is required");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        var ingredient = ingredientService.findOrCreateByName(request.ingredientName());

        ShoppingListItem item = new ShoppingListItem();
        item.setUser(user);
        item.setIngredient(ingredient);
        item.setQuantity(request.quantity());
        item.setMeasurementUnit(request.measurementUnit());
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
        if (item.getUser().getId() != userId) {
            throw new IllegalArgumentException("Item does not belong to user");
        }
        if (request.bought() == true) {
            itemRepository.delete(item);
            return null;
        }
        if (request.quantity() != null) {
            item.setQuantity(request.quantity());
        }
        if (request.measurementUnit() != null) {
            item.setMeasurementUnit(request.measurementUnit());
        }
        item = itemRepository.save(item);
        return toDto(item);
    }

    public void deleteItem(Long itemId, long userId) {
        ShoppingListItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Shopping list item not found: " + itemId));
        if (item.getUser().getId() != userId) {
            throw new IllegalArgumentException("Item does not belong to user");
        }
        itemRepository.delete(item);
    }

    private ShoppingListItemDto toDto(ShoppingListItem item) {
        var ingredientDto = ingredientToDto(item.getIngredient());
        return new ShoppingListItemDto(
                item.getShoppingListItemId(),
                item.getUser().getId(),
                ingredientDto,
                item.getQuantity(),
                item.getMeasurementUnit(),
                item.isBought()
        );
    }

    private IngredientDto ingredientToDto(backend.recetarioPersonal.model.Ingredient ing) {
        Long catId = ing.getCategory() != null ? ing.getCategory().getCategoryId() : null;
        String catName = ing.getCategory() != null ? ing.getCategory().getName() : null;
        return new IngredientDto(ing.getIngredientId(), ing.getName(), catId, catName);
    }
}