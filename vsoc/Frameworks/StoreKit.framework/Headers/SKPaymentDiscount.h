//
//  SKPaymentDiscount.h
//  StoreKit
//
//  Copyright © 2018 Apple Inc. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <StoreKit/StoreKitDefines.h>

NS_ASSUME_NONNULL_BEGIN

SK_EXTERN_CLASS
API_DEPRECATED("Create a Product.PurchaseOption.promotionalOffer to use in Product.purchase(confirmIn:options:)", ios(12.2, 18.0), tvos(12.2, 18.0), macos(10.14.4, 15.0), watchos(6.2, 11.0), visionos(1.0, 2.0))
NS_SWIFT_SENDABLE
@interface SKPaymentDiscount : NSObject {
@private
    id _internal;
}

- (instancetype)initWithIdentifier:(NSString *)identifier
                     keyIdentifier:(NSString *)keyIdentifier
                             nonce:(NSUUID *)nonce
                         signature:(NSString *)signature
                         timestamp:(NSNumber *)timestamp;

// Identifier agreed upon with the App Store for a discount of your choosing.
@property(nonatomic, copy, readonly) NSString *identifier;

// The identifier of the public/private key pair agreed upon with the App Store when the keys were generated.
@property(nonatomic, copy, readonly) NSString *keyIdentifier;

// One-time use random entropy-adding value for security.
@property(nonatomic, copy, readonly) NSUUID *nonce;

// The cryptographic signature generated by your private key.
@property(nonatomic, copy, readonly) NSString *signature;

// Timestamp of when the signature is created.
@property(nonatomic, copy, readonly) NSNumber *timestamp;

@end

NS_ASSUME_NONNULL_END
