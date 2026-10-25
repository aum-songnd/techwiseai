package com.university.regulation.models.recommendation;

public enum InteractionEventType {
    VIEW(1.0),
    PRODUCT_VIEW(1.0),
    CLICK(1.0),
    PRODUCT_CLICK(1.0),
    FAVORITE(2.0),
    ADD_TO_CART(3.0),
    PURCHASE(5.0);

    private final double weight;

    InteractionEventType(double weight) {
        this.weight = weight;
    }

    public double getWeight() {
        return weight;
    }
}
