const { UsersData } = require("../Models");

const processL2SponsorId = async () => {
    try {
        const usersWithNullL2SponsorId  = await UsersData.findAll({
            where: {
                l2_sponsorid: null,
            }
        });


        for (const user of usersWithNullL2SponsorId) {
            const sponsorId = user.sponsorid;
            const sponsorData = await UsersData.findOne({
                where: {
                    id: sponsorId,
                },
            });

            if (sponsorData && sponsorData.sponsorid) {
                await user.update({
                    l2_sponsorid: sponsorData.sponsorid,
                });
            }
        }
    } catch (error) {
        console.error('Error While adding L2 Sponsor Id:', error);
    }
}

module.exports = processL2SponsorId;