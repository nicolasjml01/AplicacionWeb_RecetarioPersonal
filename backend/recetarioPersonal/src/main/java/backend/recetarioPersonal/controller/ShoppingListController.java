package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.service.ShoppingListService;
import backend.recetarioPersonal.view.CreateShoppingListItemRequest;
import backend.recetarioPersonal.view.ShoppingListItemDto;
import backend.recetarioPersonal.view.UpdateShoppingListItemRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/shopping-list")
public class ShoppingListController {

    private final ShoppingListService shoppingListService;

    public ShoppingListController(ShoppingListService shoppingListService) {
        this.shoppingListService = shoppingListService;
    }

    @GetMapping
    public ResponseEntity<List<ShoppingListItemDto>> getList(@PathVariable long userId) {
        return ResponseEntity.ok(shoppingListService.getItemsByUser(userId));
    }

    @PostMapping
    public ResponseEntity<ShoppingListItemDto> addItem(
            @PathVariable long userId,
            @RequestBody CreateShoppingListItemRequest request) {
        ShoppingListItemDto created = shoppingListService.addItem(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{itemId}")
    public ResponseEntity<ShoppingListItemDto> updateItem(
            @PathVariable long userId,
            @PathVariable Long itemId,
            @RequestBody UpdateShoppingListItemRequest request) {
        ShoppingListItemDto updated = shoppingListService.updateItem(itemId, userId, request);
        if (updated == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> deleteItem(
            @PathVariable long userId,
            @PathVariable Long itemId) {
        shoppingListService.deleteItem(itemId, userId);
        return ResponseEntity.noContent().build();
    }
}