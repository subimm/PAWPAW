package animalsquad.server.domain.pet.service;

import animalsquad.server.domain.address.entity.Address;
import animalsquad.server.domain.address.repository.AddressRepository;
import animalsquad.server.domain.pet.dto.PetPostAdminDto;
import animalsquad.server.domain.pet.entity.Pet;
import animalsquad.server.domain.pet.entity.Species;
import animalsquad.server.domain.pet.repository.PetRepository;
import animalsquad.server.domain.post.entity.Post;
import animalsquad.server.domain.post.repository.PostRepository;
import animalsquad.server.global.auth.dto.AuthResponseDto;
import animalsquad.server.global.auth.jwt.JwtTokenProvider;
import animalsquad.server.global.enums.Role;
import animalsquad.server.global.exception.BusinessLogicException;
import animalsquad.server.global.exception.ExceptionCode;
import animalsquad.server.global.s3.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;
import java.util.Collections;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class PetService {

    private final PetRepository petRepository;
    private final AddressRepository addressRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileUploadService fileUploadService;
    private final RedisTemplate redisTemplate;
    private final JwtTokenProvider jwtTokenProvider;
    private final String folder = "profile";
    private final PostRepository postRepository;

    public Pet createPet(Pet pet, MultipartFile file) throws IllegalAccessException {
        verifyExistsId(pet.getLoginId());
        pet.setPassword(passwordEncoder.encode(pet.getPassword()));
        pet.setRoles(Collections.singletonList(Role.ROLE_USER.name()));

        int code = pet.getAddress().getCode();
        Address address = verifiedAddress(code);
        pet.setAddress(address);

        String defaultDogImageUrl = "https://animal-squad.s3.ap-northeast-2.amazonaws.com/profile/default_dog.png";
        String defaultCatImageUrl = "https://animal-squad.s3.ap-northeast-2.amazonaws.com/profile/default_cat.png";

        if (file == null && pet.getSpecies() == Species.DOG) {
            pet.setProfileImage(defaultDogImageUrl);
        } else if ( file == null && pet.getSpecies() == Species.CAT) {
            pet.setProfileImage(defaultCatImageUrl);
        } else {
                String imageUrl = fileUploadService.uploadImage(file, folder);
                pet.setProfileImage(imageUrl);
        }

        return petRepository.save(pet);
    }

    public Pet updatePet(Pet pet,long petId, MultipartFile file) throws IllegalAccessException {
        Pet findPet = findVerifiedPet(pet.getId());

        verifiedToken(pet, petId);

            Optional.ofNullable(pet.getPetName())
                    .ifPresent(name -> findPet.setPetName(name));
            Optional.ofNullable(pet.getAge())
                    .ifPresent(age -> findPet.setAge(age));
            Optional.ofNullable(pet.getGender())
                    .ifPresent(gender -> findPet.setGender(gender));
            Optional.ofNullable(pet.getSpecies())
                    .ifPresent(species -> findPet.setSpecies(species));
            Optional.ofNullable(pet.getAddress().getCode())
                    .ifPresent(code -> {
                        Address address = verifiedAddress(code);
                        findPet.setAddress(address);
                    });

        String defaultDogImageUrl = "https://animal-squad.s3.ap-northeast-2.amazonaws.com/profile/default_dog.png";
        String defaultCatImageUrl = "https://animal-squad.s3.ap-northeast-2.amazonaws.com/profile/default_cat.png";

        // 프로필 이미지 수정, 디폴트 이미지, 종에 따라 디폴트 이미지 변경
        if(file != null && !file.isEmpty()) {
            String beforeImage = findPet.getProfileImage();
            fileUploadService.deleteFile(beforeImage, folder);

            String imageUrl = fileUploadService.uploadImage(file, folder);
            findPet.setProfileImage(imageUrl);

        } else if (file != null && findPet.getProfileImage().contains("default")) {
            String imageUrl = fileUploadService.uploadImage(file, folder);
            findPet.setProfileImage(imageUrl);
        } else if (file == null && findPet.getProfileImage().contains("default") && findPet.getSpecies() == Species.DOG) {
            findPet.setProfileImage(defaultDogImageUrl);
        } else if (file == null && findPet.getProfileImage().contains("default") && findPet.getSpecies() == Species.CAT) {
            findPet.setProfileImage(defaultCatImageUrl);
        }

        Pet savedPet = petRepository.save(findPet);

        return savedPet;
    }

    public Boolean checkLoginId(String loginId) {
        return petRepository.existsByLoginId(loginId);
    }

    // 저장된 유저의 id와 요청한 유저의 id가 맞는지 검증하는 로직
    public Pet petVerifiedToken(long id, long petId) {
        Pet findPet = findPet(id);

        verifiedToken(findPet, petId);

        return findPet;
    }

    public Pet findPet(long id) {
        return findVerifiedPet(id);
    }
    // 나의 게시글 조회
    public Page<Post> findPost(int page, int size, long petId) {
        return postRepository.findAllByPet_Id(PageRequest.of(page, size, Sort.by("id").descending()), petId);
    }

    public void deletePet(long id, long petId) throws IllegalAccessException {
        Pet findPet = findVerifiedPet(id);

        verifiedToken(findPet, petId);


        String findPetLoginId = findPet.getLoginId();
        redisTemplate.delete("RT:" + findPetLoginId);
        // S3에서 image삭제
        if (!findPet.getProfileImage().contains("default")) {
            String image = findPet.getProfileImage();
            fileUploadService.deleteFile(image, folder);
        }
        petRepository.deleteById(id);
    }
    // 관리자 권한 승인 요청
    public void verifiedAdmin(long id, long petId, PetPostAdminDto petPostAdminDto, HttpServletResponse response) {
        Pet findPet = findVerifiedPet(id);

        verifiedToken(findPet, petId);

        if(findPet.getRoles().contains("ROLE_ADMIN")) {
            throw new BusinessLogicException(ExceptionCode.PET_ROLE_EXISTS);
        }

        if(!petPostAdminDto.getAdminCode().equals("동물특공대")) {
            throw new BusinessLogicException(ExceptionCode.ADMIN_CODE_NOT_MATCH);
        }


        findPet.getRoles().add((Role.ROLE_ADMIN.name()));
        petRepository.save(findPet);

        AuthResponseDto.TokenInfo tokenInfo = jwtTokenProvider.delegateToken(findPet);

        response.setHeader("Authorization", "Bearer " + tokenInfo.getAccessToken());
        response.setHeader("Refresh", tokenInfo.getRefreshToken());

        redisTemplate.opsForValue().set("RT:" + findPet.getLoginId(),tokenInfo.getRefreshToken(),tokenInfo.getRefreshTokenExpirationTime(), TimeUnit.MILLISECONDS);
    }

    private void verifiedToken(Pet pet, long petId) {
        if (petId != pet.getId()) {
            throw new BusinessLogicException(ExceptionCode.TOKEN_AND_ID_NOT_MATCH);
        }
    }

    private Address verifiedAddress(int code) {
        Optional<Address> optionalAddress = addressRepository.findByCode(code);
        Address address = optionalAddress.orElseThrow(() -> new BusinessLogicException(ExceptionCode.ADDRESS_NOT_FOUND));
        return address;
    }

    private void verifyExistsId(String loginId) {
        Optional<Pet> pet = petRepository.findByLoginId(loginId);

        if (pet.isPresent()) {
            throw new BusinessLogicException(ExceptionCode.PET_EXISTS);
        }
    }

    private Pet findVerifiedPet(long id) {
        Optional<Pet> optionalPet = petRepository.findById(id);
        Pet findPet = optionalPet.orElseThrow(() ->
                new BusinessLogicException(ExceptionCode.PET_NOT_FOUND));

        return findPet;
    }

}
