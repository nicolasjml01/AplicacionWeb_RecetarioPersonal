package backend.recetarioPersonal.service;

import backend.recetarioPersonal.model.Ingredient;
import backend.recetarioPersonal.model.RecentIngredient;
import backend.recetarioPersonal.model.User;
import backend.recetarioPersonal.repository.RecentIngredientRepository;
import backend.recetarioPersonal.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RecentIngredientService {

    private final RecentIngredientRepository recentRepository;
    private final UserRepository userRepository;

    public RecentIngredientService(
            RecentIngredientRepository recentRepository,
            UserRepository userRepository
    ) {
        this.recentRepository = recentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void touch(long userId, Ingredient ingredient) {
        if (ingredient == null || ingredient.getIngredientId() == null) {
            return;
        }

        var existing = recentRepository.findByUser_UserIdAndIngredient_IngredientId(
                userId, ingredient.getIngredientId()
        );

        if (existing.isPresent()) {
            RecentIngredient row = existing.get();
            row.setLastUsedAt(LocalDateTime.now());
            row.setUsageCount(row.getUsageCount() + 1);
            recentRepository.save(row);
        } else {
            User userRef = userRepository.getReferenceById(userId);

            RecentIngredient row = new RecentIngredient();
            row.setUser(userRef);
            row.setIngredient(ingredient);
            row.setLastUsedAt(LocalDateTime.now());
            row.setUsageCount(1);
            recentRepository.save(row);
        }

        recentRepository.deleteOlderThanTop15(userId);
    }

    @Transactional(readOnly = true)
    public List<Ingredient> getRecentIngredients(long userId) {
        return recentRepository.findTop15ByUser_UserIdOrderByLastUsedAtDesc(userId)
                .stream()
                .map(RecentIngredient::getIngredient)
                .toList();
    }
}