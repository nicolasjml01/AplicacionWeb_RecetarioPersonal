package backend.recetarioPersonal.repository;

import backend.recetarioPersonal.model.ShoppingListItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/*
   This repository is used to manage the shopping list items.
 */
public interface ShoppingListItemRepository extends JpaRepository<ShoppingListItem, Long> {

    List<ShoppingListItem> findByUser_UserId(Long userId);
}