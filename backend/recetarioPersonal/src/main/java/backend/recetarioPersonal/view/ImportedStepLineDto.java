package backend.recetarioPersonal.view;

/**
 * One preparation step from an external recipe source (preview only).
 */
public record ImportedStepLineDto(
        int stepNumber,
        String content
) {}